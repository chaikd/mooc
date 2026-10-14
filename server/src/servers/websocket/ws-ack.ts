import { logger } from '@mooc/db-shared/index.ts'
import type { Socket } from 'socket.io'

/**
 * WebSocket 统一应答协议
 *
 * 所有带 ack 回调的事件统一返回信封，前端 requestWs 负责解包：
 * - success: 是否成功
 * - data: 业务数据（成功时）
 * - error / code: 失败原因（失败时）
 */
export type WsAckCode =
  | 'INVALID_PARAMS'
  | 'UNAVAILABLE'
  | 'NOT_FOUND'
  | 'ALREADY_CLOSED'
  | 'INTERNAL_ERROR'

export type WsAck<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  code?: WsAckCode
}

export type AckCallback<T = unknown> = (ack: WsAck<T>) => void

/** handler 既可以返回裸数据（自动包装为成功），也可以直接返回信封 */
export type AckResult<T = unknown> = WsAck<T> | T | void

export function ackOk<T>(data?: T): WsAck<T> {
  return data === undefined ? { success: true } : { success: true, data }
}

export function ackFail(error: string, code: WsAckCode = 'INTERNAL_ERROR'): WsAck<never> {
  return { success: false, error, code }
}

export function isAckEnvelope(value: unknown): value is WsAck {
  return typeof value === 'object' && value !== null && 'success' in value
}

function toAck<T>(value: AckResult<T>): WsAck<T> {
  if (isAckEnvelope(value)) {
    return value as WsAck<T>
  }
  return ackOk(value as T)
}

/** 错误对象上的 code 若在白名单内则透传 */
function isWsAckCode(value: unknown): value is WsAckCode {
  const codes: WsAckCode[] = ['INVALID_PARAMS', 'UNAVAILABLE', 'NOT_FOUND', 'ALREADY_CLOSED', 'INTERNAL_ERROR']
  return typeof value === 'string' && (codes as string[]).includes(value)
}

/** 业务错误可自带 code（如 RoomError），透传给前端用于区分场景 */
function codeOf(error: unknown): WsAckCode {
  const code = (error as { code?: unknown } | null)?.code
  return isWsAckCode(code) ? code : 'INTERNAL_ERROR'
}

/**
 * 注册一个带统一 ack 信封的事件处理器。
 *
 * 保证：
 * 1. 只要客户端传了 ack 回调，就一定会被调用（避免前端 Promise 永久挂起）
 * 2. handler 抛异常时转换为失败信封并记录日志
 */
export function onWithAck<TPayload = unknown, TData = unknown>(
  socket: Socket,
  event: string,
  handler: (payload: TPayload) => Promise<AckResult<TData>> | AckResult<TData>,
) {
  // socket.io 按 emit 的参数位置传回调：`emit(event, cb)` 时回调会落在第一个参数位。
  // 这里按类型归一化，避免调用方"只传回调不传 payload"导致 ack 静默丢失。
  socket.on(event, (...args: unknown[]) => {
    const ack = args.find((arg) => typeof arg === 'function') as AckCallback<TData> | undefined
    const payload = args.find((arg) => typeof arg !== 'function') as TPayload
    void (async () => {
      try {
        const result = await handler(payload)
        ack?.(toAck(result))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error({
          message: 'ws handler error',
          event,
          socketId: socket.id,
          roomId: String(socket.handshake?.query?.roomId ?? ''),
          error: message,
        })
        ack?.(ackFail(message, codeOf(error)))
      }
    })()
  })
}
