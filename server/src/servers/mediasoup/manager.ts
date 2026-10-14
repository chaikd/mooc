import { logger } from '@mooc/db-shared/index.ts'
import * as mediasoup from 'mediasoup'
import type { Router, RouterOptions } from 'mediasoup/types'

/**
 * 房间可用的媒体编码配置（与浏览器常用协商保持一致）
 */
const MEDIA_CODECS: NonNullable<RouterOptions['mediaCodecs']> = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1500,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 2,
      'x-google-start-bitrate': 1000,
    },
  },
]

/**
 * worker 的 RTC 端口段（mediasoup 默认 10000–59999）。
 *
 * 必须与 HLS/ffmpeg 的收流端口段（transcoder.ts 的 40000–49000）完全错开：
 * mediasoup 的 PortManager 会在本段内给每个 transport 自选端口，若两段重叠，
 * 它随时可能合法地占掉我们预留给 ffmpeg 的端口。
 *
 * ⚠️ 部署时两处需与防火墙放行段一起调整。
 */
const RTC_MIN_PORT = 20000
const RTC_MAX_PORT = 39999

export type MediasoupManagerOptions = {
  /** worker 异常退出时的回调（用于降级清理房间） */
  onWorkerDied?: (error: Error) => void | Promise<void>
}

/**
 * Mediasoup 运行时管理者
 *
 * 职责：
 * 1. 懒初始化并复用单个 worker（后续可平滑演进为 worker pool）
 * 2. 为房间创建 / 回收 router
 * 3. 统一处理 worker died 与进程退出时的资源释放
 */
class MediasoupManager {
  private worker?: mediasoup.types.Worker
  private workerCreating?: Promise<mediasoup.types.Worker>
  private readonly routers = new Map<string, Router>()
  private options: MediasoupManagerOptions = {}

  configure(options: MediasoupManagerOptions) {
    this.options = { ...this.options, ...options }
  }

  /** mediasoup 是否可用（worker 存活且未损坏） */
  get isHealthy() {
    return Boolean(this.worker) && !this.worker!.closed
  }

  get workerId() {
    return this.worker?.pid
  }

  get routerCount() {
    return this.routers.size
  }

  /**
   * 获取（不存在则创建）房间专属 router
   * @returns 创建失败返回 null，调用方需自行降级
   */
  async getOrCreateRouter(roomId: string): Promise<Router | null> {
    const existed = this.routers.get(roomId)
    if (existed && !existed.closed) {
      return existed
    }
    if (existed) {
      this.routers.delete(roomId)
    }

    try {
      const worker = await this.ensureWorker()
      const router = await worker.createRouter({
        mediaCodecs: MEDIA_CODECS,
        appData: { roomId },
      })
      this.routers.set(roomId, router)
      router.observer.once('close', () => {
        if (this.routers.get(roomId) === router) {
          this.routers.delete(roomId)
        }
      })
      logger.info({ message: 'mediasoup router created', roomId, routerId: router.id })
      return router
    } catch (error) {
      logger.warn({
        message: 'mediasoup router create failed',
        roomId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  getRouter(roomId: string) {
    return this.routers.get(roomId)
  }

  closeRouter(roomId: string) {
    const router = this.routers.get(roomId)
    this.routers.delete(roomId)
    if (router && !router.closed) {
      router.close()
      logger.info({ message: 'mediasoup router closed', roomId, routerId: router.id })
    }
  }

  /** 进程退出时统一回收 worker（router 随 worker 一起销毁） */
  async shutdown() {
    const worker = this.worker
    this.worker = undefined
    this.routers.clear()
    if (!worker || worker.closed) {
      return
    }
    logger.info({ message: 'mediasoup worker closing', pid: worker.pid, routers: this.routers.size })
    worker.close()
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 2000)
      worker.observer.once('close', () => {
        clearTimeout(timer)
        resolve()
      })
    })
    logger.info({ message: 'mediasoup worker closed' })
  }

  private async ensureWorker(): Promise<mediasoup.types.Worker> {
    if (this.worker && !this.worker.closed) {
      return this.worker
    }
    if (this.workerCreating) {
      return this.workerCreating
    }

    this.workerCreating = mediasoup
      .createWorker({ logLevel: 'warn', rtcMinPort: RTC_MIN_PORT, rtcMaxPort: RTC_MAX_PORT })
      .then((worker) => {
        this.worker = worker
        this.workerCreating = undefined
        worker.once('died', (error = new Error('mediasoup worker died')) => {
          logger.error({
            message: 'mediasoup worker died',
            pid: worker.pid,
            error: error?.message ?? 'unknown',
          })
          this.worker = undefined
          this.routers.clear()
          void this.options.onWorkerDied?.(error)
        })
        logger.info({ message: 'mediasoup worker created', pid: worker.pid })
        return worker
      })
      .catch((error: unknown) => {
        this.workerCreating = undefined
        throw error
      })

    return this.workerCreating
  }
}

export const mediasoupManager = new MediasoupManager()
