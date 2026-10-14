import { logger, redisRequest } from '@mooc/db-shared/index.ts'
import type { DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/types'
import { Server, type Socket } from 'socket.io'
import { liveRoomManager } from '../live-room/room-manager.ts'
import type { TransportDirection } from '../live-room/room-runtime.ts'
import type { HlsState } from '../media-pipeline/hls-pipeline.ts'
import { ackFail, ackOk, onWithAck } from './ws-ack.ts'

/** hlsStream 未就绪时的默认等待时长（第三方一次请求即可拿到结果） */
const HLS_WAIT_DEFAULT_MS = 3000
/** 允许调用方自定义的等待上限，避免长时间占用 ack */
const HLS_WAIT_MAX_MS = 8000
/** 未就绪时建议的重试间隔：error 态退避重启用 5s（最长退避 9s），其余 2s */
const HLS_RETRY_AFTER_MS: Record<HlsState, number> = {
  idle: 2000,
  starting: 2000,
  running: 0,
  stopping: 3000,
  error: 5000,
  closed: 0,
}

function clampHlsWait(value: unknown) {
  const ms = Number(value)
  if (!Number.isFinite(ms) || ms <= 0) {
    return HLS_WAIT_DEFAULT_MS
  }
  return Math.min(ms, HLS_WAIT_MAX_MS)
}

/**
 * 直播 WebSocket 网关
 *
 * 只做协议适配：解析 payload → 调用 RoomRuntime / LiveRoomManager → 统一 ack。
 * 房间内的媒体资源生命周期全部在 server/live-room 与 server/media-pipeline 中。
 */
export default function createLiveIo(ioServer: Server) {
  const liveIo = ioServer.of('/ws/live')

  liveIo.on('connection', (socket: Socket) => {
    const roomId = String(socket.handshake.query.roomId ?? '').trim()
    if (!roomId) {
      logger.warn({ message: 'live socket rejected: missing roomId', socketId: socket.id })
      socket.disconnect(true)
      return
    }

    void socket.join(roomId)
    const room = liveRoomManager.getOrCreate(roomId)
    room.setBroadcast((event, payload) => {
      liveIo.to(roomId).emit(event, payload)
    })
    room.openSession(socket.id)

    const getLiveInfo = async () => {
      const clients = liveIo.adapter.rooms.get(roomId)
      const historyPersonCount = await redisRequest.redisClient?.sCard(`${roomId}:userIds`)
      return {
        personCount: clients?.size ?? 0,
        historyPersonCount,
      }
    }

    socket.emit('connected', { message: 'WebSocket connected successfully', socketId: socket.id })

    // ── 信令：能力协商与 transport 建立 ──────────────────────
    onWithAck(socket, 'getRtpCapabilities', async () => {
      const router = await room.ensureRouter()
      if (!router) {
        return ackFail('Mediasoup not available', 'UNAVAILABLE')
      }
      return { routerRtpCapabilities: router.rtpCapabilities }
    })

    onWithAck<{ direction?: TransportDirection }>(socket, 'getReport', async ({ direction } = {}) => {
      const transport = await room.createWebRtcTransport(socket.id, direction as TransportDirection)
      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    })

    onWithAck<{
      transportId?: string
      recvTransportId?: string
      dtlsParameters?: DtlsParameters
      rtpCapabilities?: RtpCapabilities
    }>(socket, 'transportConnected', async (payload = {}) => {
      const { transportId, recvTransportId, dtlsParameters, rtpCapabilities } = payload
      if (!dtlsParameters) {
        return ackFail('dtlsParameters is required', 'INVALID_PARAMS')
      }
      if (transportId) {
        await room.connectSendTransport(socket.id, dtlsParameters, rtpCapabilities)
      } else if (recvTransportId) {
        await room.connectRecvTransport(socket.id, dtlsParameters)
      } else {
        return ackFail('transportId or recvTransportId is required', 'INVALID_PARAMS')
      }
      return ackOk()
    })

    // ── 推流 ────────────────────────────────────────────────
    onWithAck<{
      kind?: 'audio' | 'video'
      rtpParameters?: RtpParameters
      appData?: Record<string, unknown>
    }>(socket, 'produce', async ({ kind, rtpParameters, appData } = {}) => {
      if (!kind || !rtpParameters) {
        return ackFail('kind and rtpParameters are required', 'INVALID_PARAMS')
      }
      const record = await room.produce(socket.id, { kind, rtpParameters, appData })
      // 广播给房间内所有客户端（沿用既有语义：包含推流者自己）
      liveIo.to(roomId).emit('newProduce', {
        producerId: record.producerId,
        kind: record.kind,
        appData: { ...appData, type: record.type },
      })
      return { id: record.producerId }
    })

    onWithAck<{ producerId?: string; rtpCapabilities?: RtpCapabilities }>(
      socket,
      'getConsumer',
      async (payload = {}) => room.consume(socket.id, payload),
    )

    onWithAck<{ producerId?: string; appData?: Record<string, unknown> }>(
      socket,
      'closeProducer',
      async (payload = {}) => {
        const closed = room.closeProducer(String(payload?.producerId ?? ''), payload?.appData)
        return closed ? ackOk({ closed }) : ackFail('Producer not found', 'NOT_FOUND')
      },
    )

    onWithAck(socket, 'getProduces', async () => ({ produces: room.getProducerBriefs() }))

    // ── HLS 旁路播放 ────────────────────────────────────────
    /**
     * 第三方取址：始终返回可诊断的信封，不再直接 ackFail。
     * 未就绪时先按需拉起管道并最多等待 waitMs（默认 3s），超时/失败也带上 state 与 retryAfterMs。
     * url 仅在 ready 为 true 时非空，调用方必须先判 data.ready 再拼地址。
     */
    onWithAck<{ waitMs?: number }>(socket, 'hlsStream', async (payload = {}) => {
      const hls = room.hls
      if (!hls.isReady) {
        // ensureRunning 返回 true 表示"确有 producer 可转码且已触发拉起"，这时等待才有意义；
        // 房间还没人推流时立即返回诊断结果，避免每次取址都白等 3s。
        const starting = hls.ensureRunning()
        if (starting || hls.state === 'starting' || hls.state === 'running' || hls.state === 'stopping') {
          await hls.waitUntilReady(clampHlsWait(payload?.waitMs))
        }
      }
      const { state, ready, url, lastError } = hls.status
      logger.info({
        message: 'hls stream requested',
        roomId,
        socketId: socket.id,
        ready,
        state,
        url,
      })
      return {
        ready,
        state,
        url,
        roomId,
        retryAfterMs: ready ? 0 : HLS_RETRY_AFTER_MS[state],
        ...(lastError ? { error: lastError } : {}),
      }
    })

    // ── 结束直播：房间级销毁 ─────────────────────────────────
    onWithAck(socket, 'closeLive', async () => {
      const closed = await liveRoomManager.close(roomId, `closed by ${socket.id}`)
      void liveIo.to(roomId).socketsLeave(roomId)
      return { roomId, closed }
    })

    // ── 在线/历史人数 ───────────────────────────────────────
    socket.on('recordUser', async (userInfo: { id?: string } = {}) => {
      const userId = String(userInfo?.id ?? '')
      if (!userId) {
        return
      }
      try {
        await redisRequest.redisClient?.sAdd(`${roomId}:userIds`, userId)
        liveIo.to(roomId).emit('liveRoomInfo', await getLiveInfo())
      } catch (error) {
        logger.error({ message: 'ws handler error', event: 'recordUser', roomId, socketId: socket.id, error })
      }
    })

    socket.on('disconnect', async () => {
      try {
        await socket.leave(roomId)
        ;(liveRoomManager.get(roomId) ?? room).removeSession(socket.id)
        liveIo.to(roomId).emit('liveRoomInfo', await getLiveInfo())
      } catch (error) {
        // 断线清理必须幂等，任何异常都不能冒泡成 unhandled rejection 打挂进程
        logger.error({ message: 'live socket disconnect cleanup failed', roomId, socketId: socket.id, error })
      }
    })
  })

  return liveIo
}
