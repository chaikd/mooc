import { logger } from '@mooc/db-shared/index.ts'
import type { Router } from 'mediasoup/types'
import { waitForUdpPortBound } from '@/utils/visiblePort.ts'
import type { HlsProducerItem } from '../live-room/types.ts'
import { closePlainTransportList, createPlainTransport, type PlainTransportListItemType } from '../mediasoup/transcoder.ts'
import { FFmpegProcess, hlsPlaylistUrl, type FFmpegExitInfo } from './ffmpeg-process.ts'

export type HlsState = 'idle' | 'starting' | 'running' | 'stopping' | 'error' | 'closed'

export type HlsStatus = {
  state: HlsState
  ready: boolean
  url: string | null
  roomId: string
  pid?: number
  tracks: number
  failures: number
  restarts: number
  lastError?: string
}

export type HlsPipelineOptions = {
  roomId: string
  /** router 可能随房间关闭失效，因此用取值函数 */
  getRouter: () => Router | undefined
  /** 当前房间内所有 producer（由 RoomRuntime 提供） */
  getProducers: () => HlsProducerItem[]
  /** HLS 可用性变化：true → ffmpegReady，false → ffmpegStoped */
  onReadyChange?: (ready: boolean) => void
}

/** 等待 ffmpeg 绑定 SDP 声明的 RTP 端口 */
const PORT_BIND_TIMEOUT_MS = 8000
/** plainTransport.connect() 失败重试 */
const CONNECT_RETRIES = 3
const CONNECT_RETRY_DELAY_MS = 500
/** 轮询"本代已写出分片"（playlist 出现 #EXTINF 条目），就绪的唯一信号 */
const READY_POLL_INTERVAL_MS = 250
/** 超过该时长未出片仅告警一次，之后降频继续观察（3.26 方案 A：首片可远超 20s） */
const READY_POLL_TIMEOUT_MS = 20000
/** 告警后的低频观察间隔，贯穿进程始终直到出片或退出 */
const READY_SLOW_POLL_MS = 1000
/** 意外退出后的退避重启（连续失败上限 = 数组长度） */
const RESTART_BACKOFF_MS = [1000, 3000, 9000]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 房间级 HLS 旁路管道
 *
 * 状态机：idle → starting → running → stopping → idle
 * 所有启停进入同一条串行队列，避免并发重建导致 plain transport 泄漏。
 *
 * 关键时序（此前 HLS 恒不可用的根因就在这里）：
 *   1. 申请端口段（ffmpeg 收流口 + plainTransport 本地口，一次性原子预留）
 *   2. spawn ffmpeg，由它自己 bind SDP 里声明的 UDP 端口
 *   3. **确认端口已被 ffmpeg 绑定**之后，才 plainTransport.connect()
 *   4. RTP 到达 → ffmpeg 出分片 → 播放列表落盘 → running
 * 旧实现把 connect() 挂在"ffmpeg 第一条 stderr"上：banner 早于 bind 端口，
 * 于是 RTP 打向还没有监听者的端口，全部丢弃，ffmpeg 在 listen_timeout（默认 10s）后退出。
 */
export class HlsPipeline {
  state: HlsState = 'idle'
  private items: PlainTransportListItemType[] = []
  private process: FFmpegProcess | null = null
  private timer: NodeJS.Timeout | null = null
  private readyTimer: NodeJS.Timeout | null = null
  private restartTimer: NodeJS.Timeout | null = null
  private queue: Promise<void> = Promise.resolve()
  private disposed = false
  private failures = 0
  private restarts = 0
  private lastError?: string

  constructor(private readonly options: HlsPipelineOptions) {}

  get isReady() {
    const process = this.process
    if (!process) {
      return false
    }
    // running 只会由 watchPlaylist 观察到"本代 playlist 出现 #EXTINF 条目"后置位，
    // 而输出目录在 spawn 前清空、条目必属本代，无需再叠加文件系统检查（3.25 不变量 2）
    return this.state === 'running' && process.isAlive()
  }

  /** 播放地址（恒定，客户端只绑一次；缓存由 /hls 静态挂载的 Cache-Control 头控制） */
  get playlistHref() {
    return hlsPlaylistUrl(this.options.roomId)
  }

  /** 供 ack / 指标使用的只读快照 */
  get status(): HlsStatus {
    const pid = this.process?.pid
    return {
      roomId: this.options.roomId,
      state: this.state,
      ready: this.isReady,
      url: this.isReady ? this.playlistHref : null,
      ...(pid ? { pid } : {}),
      tracks: this.items.length,
      failures: this.failures,
      restarts: this.restarts,
      ...(this.lastError ? { lastError: this.lastError } : {}),
    }
  }

  /** producer 集合变化后重建管道，默认 200ms 防抖 */
  scheduleSync(delayMs = 200) {
    if (this.disposed) {
      return
    }
    this.cancelRestart()
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.timer = null
      void this.sync()
    }, delayMs)
  }

  /** 立即按当前 producer 重建管道 */
  sync(): Promise<void> {
    return this.enqueue(() => this.run())
  }

  /**
   * 无播放器在等结果时使用：确保管道在跑（idle/error 且有 producer 时拉起）。
   * 返回是否已经在排队/运行，不代表已就绪。
   */
  ensureRunning(): boolean {
    if (this.disposed || this.state === 'starting' || this.state === 'running') {
      return false
    }
    if (!pickHlsProducers(this.options.getProducers()).length) {
      return false
    }
    this.cancelRestart()
    void this.sync()
    return true
  }

  /** 等待就绪，超时返回 false（第三方 hlsStream ack 用） */
  async waitUntilReady(timeoutMs = 3000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (this.isReady) {
        return true
      }
      if (this.state === 'closed') {
        return false
      }
      await delay(100)
    }
    return this.isReady
  }

  /** 无可用轨道 / 房间空闲时停止并清理产物 */
  stop(reason: 'idle' | 'closing' = 'idle'): Promise<void> {
    this.cancelRestart()
    return this.enqueue(async () => {
      await this.teardown(true)
      this.state = this.disposed ? 'closed' : 'idle'
      logger.info({ message: 'hls pipeline stopped', roomId: this.options.roomId, reason })
    })
  }

  /** 房间销毁 */
  dispose(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve()
    }
    this.disposed = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.cancelRestart()
    return this.enqueue(async () => {
      await this.teardown(true)
      this.state = 'closed'
      logger.info({ message: 'hls pipeline disposed', roomId: this.options.roomId })
    })
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.queue.then(task, task)
    // 队列本身吞掉异常，保证后续任务继续执行
    this.queue = next.then(noop, noop)
    return next
  }

  /** 永不 reject：内部各处都以 `void this.sync()` 触发，异常必须在本函数内消化 */
  private async run() {
    if (this.disposed) {
      return
    }
    let items: PlainTransportListItemType[] = []
    try {
      // 重建前先回收上一轮资源并确认进程退出；本代 spawn 前会清空输出目录，不再保留产物
      await this.teardown(false)

      const router = this.options.getRouter()
      const producers = pickHlsProducers(this.options.getProducers())

      if (!router) {
        this.state = 'error'
        logger.warn({ message: 'hls pipeline skipped: router unavailable', roomId: this.options.roomId })
        return
      }
      if (!producers.length) {
        this.state = 'idle'
        return
      }

      this.state = 'starting'
      items = await createPlainTransport(router, producers, this.options.roomId)
      this.items = items
      await Promise.all(items.map((item) => item.consumer.resume()))

      const process = new FFmpegProcess(this.options.roomId, items, {
        onExit: (info) => this.handleExit(process, info),
      })
      this.process = process
      process.start()
      logger.info({
        message: 'hls pipeline starting',
        roomId: this.options.roomId,
        pid: process.pid,
        tracks: producers.map((item) => item.type),
        ports: process.listenPorts,
      })
      // 就绪唯一入口：spawn 后立即观察本代出片（stderr 的 Opening 不再直通 running）
      this.watchPlaylist(process)

      // 端口就绪 → 显式 connect（comedia:false 下不调用就永远不发流）
      await this.bindPortsAndConnect(process, items)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const current = this.process
      // 本轮进程若还在，先停掉并确认退出，避免僵尸 ffmpeg 占着端口与输出目录写权
      if (current) {
        await current.stop()
      }
      closePlainTransportList(items)
      this.items = []
      if (this.process === current) {
        this.process = null
      }
      this.failures += 1
      this.lastError = message
      this.state = 'error'
      logger.error({ message: 'hls pipeline start failed', roomId: this.options.roomId, error: message })
      this.scheduleRestart()
    }
  }

  private async bindPortsAndConnect(process: FFmpegProcess, items: PlainTransportListItemType[]) {
    const expected = process.listenPorts
    const bound = await waitForUdpPortBound(expected, {
      timeoutMs: PORT_BIND_TIMEOUT_MS,
      aborted: () => !process.isAlive(),
    })
    if (bound.length < expected.length) {
      throw new Error(`ffmpeg did not bind RTP ports within ${PORT_BIND_TIMEOUT_MS}ms (got ${bound.length}/${expected.length}, alive=${process.isAlive()})`)
    }
    logger.info({ message: 'ffmpeg rtp ports bound', roomId: this.options.roomId, pid: process.pid, ports: expected })
    for (const item of items) {
      await connectWithRetry(this.options.roomId, item)
    }
  }

  /**
   * 就绪判定单信号：本代 playlist 出现 `#EXTINF` 条目（segmentCount > 0）。
   * 目录在 spawn 前清空，条目必属本代，结构上杜绝 existsSync 陈旧文件假就绪；
   * 只有真正开始出片才对第三方有意义。
   *
   * 观察贯穿进程始终（3.26 方案 A）：READY_POLL_TIMEOUT_MS 到点只告警一次并降频继续轮询，
   * 屏幕共享首片落盘实测可远超 20s（15s～38s+），一次性窗口会永久丢失真就绪信号。
   */
  private watchPlaylist(process: FFmpegProcess) {
    this.clearReadyTimer()
    const startedAt = Date.now()
    let warned = false
    const tick = () => {
      this.readyTimer = null
      if (this.process !== process || !process.isAlive()) {
        return
      }
      if (process.segmentCount() > 0) {
        this.markRunning(process)
        return
      }
      if (!warned && Date.now() - startedAt > READY_POLL_TIMEOUT_MS) {
        warned = true
        logger.warn({ message: 'hls playlist not written in time, keep watching', roomId: this.options.roomId, pid: process.pid })
      }
      this.readyTimer = setTimeout(tick, warned ? READY_SLOW_POLL_MS : READY_POLL_INTERVAL_MS)
    }
    this.readyTimer = setTimeout(tick, READY_POLL_INTERVAL_MS)
  }

  private markRunning(process: FFmpegProcess) {
    if (this.process !== process || this.state === 'running') {
      return
    }
    this.state = 'running'
    this.restarts = 0
    this.lastError = undefined
    logger.info({
      message: 'hls pipeline ready',
      roomId: this.options.roomId,
      pid: process.pid,
      url: this.playlistHref,
      tracks: this.items.length,
    })
    this.options.onReadyChange?.(true)
  }

  private handleExit(process: FFmpegProcess, info: FFmpegExitInfo) {
    // 已被本轮 teardown 替换的进程，退出不影响当前状态
    if (this.process !== process) {
      return
    }
    this.process = null
    this.clearReadyTimer()
    closePlainTransportList(this.items)
    this.items = []
    this.options.onReadyChange?.(false)

    if (info.intentional || this.disposed) {
      this.state = this.disposed ? 'closed' : 'idle'
      return
    }

    this.failures += 1
    this.lastError = `ffmpeg exited code=${info.code} signal=${info.signal} logs=${truncateLogs(info.logs)}`
    logger.error({
      message: 'ffmpeg exited unexpectedly',
      roomId: this.options.roomId,
      pid: process.pid,
      code: info.code,
      signal: info.signal,
      logs: info.logs,
    })
    this.scheduleRestart()
  }

  /** 仍有推流时按退避重启；连续失败到达上限才停在 error */
  private scheduleRestart() {
    if (this.disposed || this.restartTimer) {
      return
    }
    if (!pickHlsProducers(this.options.getProducers()).length) {
      this.state = 'idle'
      this.restarts = 0
      return
    }
    if (this.restarts >= RESTART_BACKOFF_MS.length) {
      this.state = 'error'
      logger.error({
        message: 'hls pipeline give up restarting',
        roomId: this.options.roomId,
        restarts: this.restarts,
        lastError: this.lastError,
      })
      return
    }
    const waitMs = RESTART_BACKOFF_MS[this.restarts]
    this.restarts += 1
    this.state = 'starting'
    logger.warn({ message: 'hls pipeline restart scheduled', roomId: this.options.roomId, restarts: this.restarts, waitMs })
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      void this.sync()
    }, waitMs)
  }

  private cancelRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.state === 'error') {
      this.restarts = 0
    }
  }

  private clearReadyTimer() {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer)
      this.readyTimer = null
    }
  }

  private async teardown(removeOutput: boolean) {
    const process = this.process
    const items = this.items
    this.process = null
    this.items = []
    this.clearReadyTimer()

    if (process) {
      const wasServing = this.state === 'running' || this.state === 'starting'
      this.state = 'stopping'
      // 确认进程真正退出后再继续：重建/清目录前的"单一写者"前提（3.25 不变量 1）
      await process.stop()
      if (removeOutput) {
        process.removeOutput()
      }
      if (wasServing) {
        this.options.onReadyChange?.(false)
      }
    }
    closePlainTransportList(items)
  }
}

/** comedia:false 的 plainTransport 必须显式 connect，失败做有限重试 */
async function connectWithRetry(roomId: string, item: PlainTransportListItemType) {
  let lastError: unknown
  for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt += 1) {
    try {
      await item.plainTransport.connect({
        ip: '127.0.0.1',
        port: item.ffmpegPort,
        rtcpPort: item.ffmpegRtcpPort,
      })
      logger.info({
        message: 'hls plain transport connected',
        roomId,
        producerId: item.producerId,
        from: item.plainRtpPort,
        to: item.ffmpegPort,
        attempt,
      })
      return
    } catch (error) {
      lastError = error
      logger.warn({
        message: 'hls plain transport connect failed',
        roomId,
        producerId: item.producerId,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      })
      await delay(CONNECT_RETRY_DELAY_MS)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('plainTransport.connect failed')
}

/**
 * 选取参与 HLS 混流的轨道：
 * 音频 + 屏幕共享优先，没有屏幕共享时回退摄像头。
 */
function pickHlsProducers(items: HlsProducerItem[]): HlsProducerItem[] {
  const camera = items.find((item) => item.type === 'camera')
  const list = items.filter((item) => item.type !== 'camera')
  const hasScreen = list.some((item) => String(item.type ?? '').startsWith('screen'))
  if (!hasScreen && camera) {
    list.push(camera)
  }
  return list
}

function truncateLogs(logs: string[]) {
  return logs.join(' | ').slice(0, 500)
}

function noop() {
  /* noop */
}
