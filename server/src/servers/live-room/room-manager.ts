import { logger } from '@mooc/db-shared/index.ts'
import { RoomRuntime } from './room-runtime.ts'
import type { RoomMetrics } from './types.ts'

/**
 * 房间注册表
 *
 * 只负责「房间实例」的创建与回收，房间内部资源由 RoomRuntime 自行管理。
 * 未来做多 worker / 多实例调度时，改造集中在这里。
 */
class LiveRoomManager {
  private readonly rooms = new Map<string, RoomRuntime>()

  get roomCount() {
    return this.rooms.size
  }

  /** 获取房间，不存在则创建 */
  getOrCreate(roomId: string): RoomRuntime {
    const existed = this.rooms.get(roomId)
    if (existed && existed.state !== 'closed') {
      return existed
    }
    if (existed) {
      this.rooms.delete(roomId)
    }
    const room = new RoomRuntime(roomId)
    this.rooms.set(roomId, room)
    logger.info({ message: 'live room created', roomId })
    return room
  }

  get(roomId: string) {
    return this.rooms.get(roomId)
  }

  list(): RoomRuntime[] {
    return [...this.rooms.values()]
  }

  /** 关闭并从注册表移除 */
  async close(roomId: string, reason: string) {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }
    this.rooms.delete(roomId)
    await room.close(reason)
    return true
  }

  /** mediasoup worker 异常退出 / 进程关闭时，回收所有房间 */
  async closeAll(reason: string) {
    const rooms = [...this.rooms.values()]
    this.rooms.clear()
    await Promise.all(rooms.map((room) => room.close(reason)))
    logger.info({ message: 'all live rooms closed', reason, count: rooms.length })
  }

  metrics(): RoomMetrics[] {
    return [...this.rooms.values()].map((room) => room.getMetrics())
  }
}

export const liveRoomManager = new LiveRoomManager()

let metricsTimer: NodeJS.Timeout | null = null

/** 周期性输出房间指标（无房间时静默），便于长期运行的可观测性 */
export function startRoomMetricsReporter(intervalMs = 30_000) {
  if (metricsTimer) {
    return
  }
  metricsTimer = setInterval(() => {
    const rooms = liveRoomManager.metrics()
    if (!rooms.length) {
      return
    }
    logger.info({
      message: 'live room metrics',
      roomCount: rooms.length,
      rooms,
    })
  }, intervalMs)
  metricsTimer.unref()
}

export function stopRoomMetricsReporter() {
  if (metricsTimer) {
    clearInterval(metricsTimer)
    metricsTimer = null
  }
}
