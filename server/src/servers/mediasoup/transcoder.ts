import { releaseUdpPortBlock, reserveUdpPortBlock, type UdpPortBlock } from '@/utils/visiblePort.ts'
import { logger } from '@mooc/db-shared/index.ts'
import type { Consumer, PlainTransport, Producer, Router } from 'mediasoup/types'

/**
 * ffmpeg 收流端口段。
 * 必须与 mediasoup worker 的 rtcMinPort–rtcMaxPort（见 manager.ts 的 20000–39999）
 * 完全分家：一旦两段重叠，worker 的 PortManager 随时可能合法占用我们给 ffmpeg 预留的端口。
 */
const UDP_PORT_MIN = 40000
const UDP_PORT_MAX = 49000

export interface PlainTransportListItemType {
  consumer: Consumer,
  plainTransport: PlainTransport,
  producerId: string,
  ffmpegPort: number,
  ffmpegRtcpPort: number,
  /** mediasoup 侧真实的本地 RTP 端口（worker 自选，仅用于日志/metrics 排障） */
  plainRtpPort: number,
  ports: number[]
}

/**
 * 为一组 producer 建立 plain transport（RTP 旁路输出，供 FFmpeg 拉流）
 *
 * 生命周期由调用方（HlsPipeline）统一管理：
 * 返回的 consumer / plainTransport / 端口段 需要在管道停止时显式回收。
 *
 * 注意：plainTransport 处于 `comedia: false` 模式，创建完并不会立刻发流，
 * 必须由调用方在 FFmpeg 真正监听端口之后调用 `connect()`。
 */
export async function createPlainTransport(
  mediasoupRouter: Router,
  producerList: { producer: Producer, type: string }[],
  roomId = '',
): Promise<PlainTransportListItemType[]> {
  // 端口必须串行申请：并发探测会拿到同一段端口
  const blocks: UdpPortBlock[] = []
  for (let i = 0; i < producerList.length; i += 1) {
    try {
      blocks.push(await reserveUdpPortBlock(UDP_PORT_MIN, UDP_PORT_MAX))
    } catch (error) {
      blocks.forEach(releaseUdpPortBlock)
      throw error
    }
  }

  const created: PlainTransportListItemType[] = []
  try {
    const datas = producerList.map(async (item, k) => {
      const block = blocks[k]
      const plainTransport = await mediasoupRouter.createPlainTransport({
        listenInfo: {
          ip: '127.0.0.1',
          protocol: 'udp',
          // 不指定 port：与 WebRTC transport 一样走 worker 的 PortManager 自分配（20000–39999）。
          // 显式指定端口会与 mediasoup 自己的端口管理抢坑，一旦该端口在 worker 侧已被占用，
          // uv_udp_bind() 必然 EADDRINUSE 且没有回退，重试还是同一个端口 → 死循环。
          // comedia:false 下 connect() 传的是「目的端 ffmpeg 端口」，与本端选哪个端口无关。
        },
        rtcpMux  : false,
        comedia  : false // 非自动模式：需要调用方显式 connect
      })
      const consumer = await plainTransport.consume({
        producerId: item.producer.id,
        rtpCapabilities: mediasoupRouter.rtpCapabilities,
        paused: true
      })
      const result: PlainTransportListItemType = {
        consumer,
        plainTransport,
        producerId: item.producer.id,
        ffmpegPort: block.ffmpegPort,
        ffmpegRtcpPort: block.ffmpegRtcpPort,
        // 读回 worker 实际分配的本地端口，供日志/metrics 排障
        plainRtpPort: plainTransport.tuple?.localPort ?? 0,
        ports: block.ports
      }
      created.push(result)
      return result
    })

    const list = await Promise.all(datas)
    logger.info({
      message: 'hls plain transports created',
      roomId,
      ports: list.map((item) => ({ ffmpeg: item.ffmpegPort, ffmpegRtcp: item.ffmpegRtcpPort, plain: item.plainRtpPort })),
    })
    return list
  } catch (error) {
    // 半途失败时回收已创建的 transport 与端口段，避免泄漏
    created.forEach((item) => {
      try { item.consumer?.close() } catch { /* 已关闭 */ }
      try { item.plainTransport?.close() } catch { /* 已关闭 */ }
      releaseUdpPortBlock({ ports: item.ports })
    })
    blocks.forEach(releaseUdpPortBlock)
    throw error
  }
}

/** 回收一组 plain transport 与其 consumer、端口段（幂等） */
export function closePlainTransportList(list: PlainTransportListItemType[]) {
  list.forEach((item) => {
    try {
      item.consumer?.close()
    } catch { /* 已关闭 */ }
    try {
      item.plainTransport?.close()
    } catch { /* 已关闭 */ }
    releaseUdpPortBlock({ ports: item.ports })
  })
}
