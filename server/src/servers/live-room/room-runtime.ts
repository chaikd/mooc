import { logger } from '@mooc/db-shared/index.ts'
import type {
  Consumer,
  DtlsParameters,
  Producer,
  RtpCapabilities,
  RtpParameters,
  Router,
} from 'mediasoup/types'
import { HlsPipeline } from '../media-pipeline/hls-pipeline.ts'
import { mediasoupManager } from '../mediasoup/manager.ts'
import type {
  ConsumerParams,
  ProducerRecord,
  RoomBroadcastEvent,
  RoomEmitter,
  RoomMetrics,
  RoomState,
  SessionRecord,
} from './types.ts'

export type TransportDirection = 'send' | 'recv'

export type ProduceRequest = {
  kind: 'audio' | 'video'
  rtpParameters: RtpParameters
  appData?: Record<string, unknown>
}

export type RoomErrorCode = 'UNAVAILABLE' | 'NOT_FOUND' | 'INVALID_PARAMS'

/** 房间层错误，网关层可直接转换为 ack 失败信封 */
export class RoomError extends Error {
  constructor(readonly code: RoomErrorCode, message: string) {
    super(message)
    this.name = 'RoomError'
  }
}

/**
 * 单房间运行态
 *
 * 持有一个房间的全部媒体资源：
 * - router（归属 MediasoupManager）
 * - 每个 socket 的收发 transport
 * - producer 与「producer → 各观众 consumer」的消费关系
 * - HLS 旁路管道
 *
 * 不直接依赖 socket.io：广播通过注入的 emitter 完成，便于将来替换为多实例路由。
 */
export class RoomRuntime {
  readonly roomId: string
  state: RoomState = 'idle'
  readonly hls: HlsPipeline

  private readonly sessions = new Map<string, SessionRecord>()
  private readonly producers = new Map<string, ProducerRecord>()
  /** producerId → (socketId → consumer)，一个 producer 可被多个观众消费 */
  private readonly producerConsumers = new Map<string, Map<string, Consumer>>()

  private emitter?: RoomEmitter
  private closing = false

  constructor(roomId: string) {
    this.roomId = roomId
    this.hls = new HlsPipeline({
      roomId,
      getRouter: () => mediasoupManager.getRouter(roomId),
      getProducers: () =>
        [...this.producers.values()].map((item) => ({ producer: item.producer, type: item.type })),
      onReadyChange: (ready) => {
        this.broadcast(ready ? 'ffmpegReady' : 'ffmpegStoped')
      },
    })
  }

  /** 网关层注入广播实现（每次连接刷新即可，重复设置无副作用） */
  setBroadcast(emitter: RoomEmitter) {
    this.emitter = emitter
  }

  get producerCount() {
    return this.producers.size
  }

  get consumerCount() {
    let total = 0
    this.producerConsumers.forEach((map) => {
      total += map.size
    })
    return total
  }

  get sessionCount() {
    return this.sessions.size
  }

  // ── router ────────────────────────────────────────────────
  async ensureRouter(): Promise<Router | null> {
    return mediasoupManager.getOrCreateRouter(this.roomId)
  }

  getRouter() {
    return mediasoupManager.getRouter(this.roomId)
  }

  // ── session ───────────────────────────────────────────────
  openSession(socketId: string): SessionRecord {
    const existed = this.sessions.get(socketId)
    if (existed) {
      return existed
    }
    const session: SessionRecord = { socketId, hasPublished: false }
    this.sessions.set(socketId, session)
    return session
  }

  private requireSession(socketId: string): SessionRecord {
    const session = this.sessions.get(socketId)
    if (!session) {
      throw new RoomError('NOT_FOUND', 'Session not found')
    }
    return session
  }

  /** 创建（并替换）该会话的收发 transport，避免重复申请导致 transport 泄漏 */
  async createWebRtcTransport(socketId: string, direction: TransportDirection) {
    if (direction !== 'send' && direction !== 'recv') {
      throw new RoomError('INVALID_PARAMS', 'Invalid transport direction')
    }
    const router = await this.ensureRouter()
    if (!router) {
      throw new RoomError('UNAVAILABLE', 'Mediasoup not available')
    }
    const session = this.openSession(socketId)
    const transport = await router.createWebRtcTransport({
      listenInfos: [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedAddress: process.env.WEBRTC_TRANSPORT_IP,
          exposeInternalIp: true,
        },
        {
          protocol: 'tcp',
          ip: '0.0.0.0',
          announcedAddress: process.env.WEBRTC_TRANSPORT_IP,
          exposeInternalIp: true,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      appData: { direction, roomId: this.roomId, socketId },
    })

    const previous = direction === 'send' ? session.sendTransport : session.recvTransport
    if (previous) {
      closeQuietly(() => previous.close(), { roomId: this.roomId, socketId, direction })
    }
    if (direction === 'send') {
      session.sendTransport = transport
    } else {
      session.recvTransport = transport
    }
    logger.info({
      message: 'live room transport created',
      roomId: this.roomId,
      socketId,
      direction,
      transportId: transport.id,
    })
    return transport
  }

  async connectSendTransport(
    socketId: string,
    dtlsParameters: DtlsParameters,
    rtpCapabilities?: RtpCapabilities,
  ) {
    const session = this.requireSession(socketId)
    if (!session.sendTransport) {
      throw new RoomError('NOT_FOUND', 'Send transport not found')
    }
    await session.sendTransport.connect({ dtlsParameters })
    if (rtpCapabilities) {
      session.rtpCapabilities = rtpCapabilities
    }
  }

  async connectRecvTransport(socketId: string, dtlsParameters: DtlsParameters) {
    const session = this.requireSession(socketId)
    if (!session.recvTransport) {
      throw new RoomError('NOT_FOUND', 'Recv transport not found')
    }
    await session.recvTransport.connect({ dtlsParameters })
  }

  // ── producer ──────────────────────────────────────────────
  /** 推流；返回的 producerId 必须回给客户端（mediasoup-client 依赖 { id }） */
  async produce(socketId: string, request: ProduceRequest): Promise<ProducerRecord> {
    const session = this.requireSession(socketId)
    if (!session.sendTransport) {
      throw new RoomError('NOT_FOUND', 'Send transport not found')
    }
    const appData: Record<string, unknown> = { ...request.appData, socketId, roomId: this.roomId }
    const producer = await session.sendTransport.produce({
      kind: request.kind,
      rtpParameters: request.rtpParameters,
      appData,
    })
    const record: ProducerRecord = {
      producerId: producer.id,
      producer,
      socketId,
      kind: producer.kind,
      type: String(appData.type ?? request.kind),
    }
    this.producers.set(record.producerId, record)
    session.hasPublished = true
    this.state = 'live'
    this.watchProducer(producer)
    this.hls.scheduleSync()

    logger.info({
      message: 'live room producer added',
      roomId: this.roomId,
      socketId,
      producerId: producer.id,
      kind: record.kind,
      type: record.type,
    })
    return record
  }

  /** 外部（transport 关闭、worker 退出等）导致的 producer 关闭也要同步清理 */
  private watchProducer(producer: Producer) {
    producer.observer.once('close', () => {
      if (!this.producers.has(producer.id)) {
        return
      }
      const type = this.producers.get(producer.id)?.type
      this.dropProducer(producer.id)
      logger.warn({
        message: 'live room producer closed externally',
        roomId: this.roomId,
        producerId: producer.id,
        type,
      })
      if (!this.closing) {
        this.broadcast('producerClosed', { producerId: producer.id, appData: { type } })
      }
    })
  }

  getProducerBriefs() {
    return [...this.producers.values()].map((item) => ({
      producer: { id: item.producerId },
      type: item.type,
    }))
  }

  /** 客户端主动关闭某一路流 */
  closeProducer(producerId: string, appData?: Record<string, unknown>) {
    const record = this.producers.get(producerId)
    if (!record) {
      return false
    }
    this.dropProducer(producerId)
    closeQuietly(() => record.producer.close(), { roomId: this.roomId, producerId })
    logger.info({
      message: 'live room producer closed',
      roomId: this.roomId,
      producerId,
      type: record.type,
    })
    if (!this.closing) {
      this.broadcast('producerClosed', { producerId, appData })
    }
    return true
  }

  /**
   * 保持既有语义：推流者断线时关闭房间内全部 producer，
   * 并广播一次不带 producerId 的 producerClosed，让前端清空消费列表。
   */
  closeAllProducers(reason: string) {
    if (!this.producers.size) {
      return
    }
    const records = [...this.producers.values()]
    records.forEach((record) => {
      this.dropProducer(record.producerId)
      closeQuietly(() => record.producer.close(), { roomId: this.roomId, producerId: record.producerId })
    })
    this.state = 'idle'
    logger.info({
      message: 'live room producers closed',
      roomId: this.roomId,
      reason,
      count: records.length,
    })
    if (!this.closing) {
      this.broadcast('producerClosed', {})
    }
  }

  /** 从房间移除 producer 记录并回收其所有消费者（不触发广播） */
  private dropProducer(producerId: string) {
    this.producers.delete(producerId)
    const consumers = this.producerConsumers.get(producerId)
    if (consumers) {
      consumers.forEach((consumer) => {
        closeQuietly(() => consumer.close(), { roomId: this.roomId, producerId })
      })
      this.producerConsumers.delete(producerId)
    }
    if (!this.closing) {
      this.hls.scheduleSync()
      if (!this.producers.size) {
        this.state = 'idle'
      }
    }
  }

  // ── consumer ──────────────────────────────────────────────
  /** 建立观众消费关系；返回 mediasoup-client recvTransport.consume 所需参数 */
  async consume(
    socketId: string,
    params: { producerId?: string; rtpCapabilities?: RtpCapabilities },
  ): Promise<ConsumerParams> {
    const { producerId } = params
    if (!producerId) {
      throw new RoomError('INVALID_PARAMS', 'producerId is required')
    }
    const record = this.producers.get(producerId)
    if (!record || record.producer.closed) {
      throw new RoomError('NOT_FOUND', 'Producer not found')
    }
    const router = this.getRouter()
    if (!router) {
      throw new RoomError('UNAVAILABLE', 'Mediasoup not available')
    }
    const session = this.requireSession(socketId)
    const rtpCapabilities = params.rtpCapabilities ?? session.rtpCapabilities
    if (!rtpCapabilities) {
      throw new RoomError('INVALID_PARAMS', 'rtpCapabilities is required')
    }
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new RoomError('UNAVAILABLE', 'Cannot consume the producer')
    }
    const recvTransport = session.recvTransport
    if (!recvTransport) {
      throw new RoomError('NOT_FOUND', 'Recv transport not found')
    }

    // 同一观众重复订阅同一 producer：先回收旧的，避免 consumer 泄漏
    const bySocket = this.producerConsumers.get(producerId) ?? new Map<string, Consumer>()
    const old = bySocket.get(socketId)
    if (old) {
      closeQuietly(() => old.close(), { roomId: this.roomId, producerId, socketId })
      bySocket.delete(socketId)
    }
    const consumer = await recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    })
    bySocket.set(socketId, consumer)
    this.producerConsumers.set(producerId, bySocket)

    logger.info({
      message: 'live room consumer created',
      roomId: this.roomId,
      socketId,
      producerId,
      consumerId: consumer.id,
    })
    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    }
  }

  // ── 清理 ──────────────────────────────────────────────────
  /** 会话离开：关闭其 transport 与 consumer；若是推流者，沿用整房 producer 关闭语义 */
  removeSession(socketId: string) {
    const session = this.sessions.get(socketId)
    if (!session) {
      return { hasPublished: false }
    }
    this.sessions.delete(socketId)
    closeQuietly(() => session.sendTransport?.close(), { roomId: this.roomId, socketId, kind: 'send' })
    closeQuietly(() => session.recvTransport?.close(), { roomId: this.roomId, socketId, kind: 'recv' })
    this.producerConsumers.forEach((bySocket) => {
      const consumer = bySocket.get(socketId)
      if (consumer) {
        closeQuietly(() => consumer.close(), { roomId: this.roomId, socketId })
        bySocket.delete(socketId)
      }
    })
    logger.info({
      message: 'live room session removed',
      roomId: this.roomId,
      socketId,
      hasPublished: session.hasPublished,
    })

    if (session.hasPublished) {
      this.closeAllProducers('publisher disconnected')
    }
    return { hasPublished: session.hasPublished }
  }

  getMetrics(): RoomMetrics {
    const hls = this.hls.status
    return {
      roomId: this.roomId,
      state: this.state,
      sessionCount: this.sessions.size,
      producerCount: this.producers.size,
      consumerCount: this.consumerCount,
      hlsState: hls.state,
      hlsReady: hls.ready,
      hlsTracks: hls.tracks,
      hlsPid: hls.pid,
      hlsFailures: hls.failures,
      hlsRestarts: hls.restarts,
      hlsLastError: hls.lastError,
    }
  }

  /** 房间结束：回收全部媒体资源并停止 HLS 管道 */
  async close(reason: string) {
    if (this.state === 'closed') {
      return
    }
    this.closing = true
    this.state = 'closing'
    logger.info({ message: 'live room closing', roomId: this.roomId, reason })
    this.broadcast('liveEnded', { roomId: this.roomId })

    await this.hls.dispose()

    this.producerConsumers.forEach((bySocket) => {
      bySocket.forEach((consumer) => {
        closeQuietly(() => consumer.close(), { roomId: this.roomId })
      })
    })
    this.producerConsumers.clear()

    this.producers.forEach((record) => {
      closeQuietly(() => record.producer.close(), { roomId: this.roomId, producerId: record.producerId })
    })
    this.producers.clear()

    this.sessions.forEach((session) => {
      closeQuietly(() => session.sendTransport?.close(), { roomId: this.roomId, socketId: session.socketId })
      closeQuietly(() => session.recvTransport?.close(), { roomId: this.roomId, socketId: session.socketId })
    })
    this.sessions.clear()

    mediasoupManager.closeRouter(this.roomId)
    this.state = 'closed'
    logger.info({ message: 'live room closed', roomId: this.roomId, reason })
  }

  private broadcast(event: RoomBroadcastEvent, payload?: unknown) {
    if (!this.emitter) {
      logger.warn({ message: 'live room broadcast skipped: no emitter', roomId: this.roomId, event })
      return
    }
    try {
      this.emitter(event, payload)
    } catch (error) {
      logger.error({
        message: 'live room broadcast failed',
        roomId: this.roomId,
        event,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

function closeQuietly(close: () => void | undefined, context: Record<string, unknown>) {
  try {
    close()
  } catch (error) {
    logger.warn({
      message: 'mediasoup resource close failed',
      ...context,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
