import dgram from 'node:dgram'

/**
 * 每条 HLS 旁路轨道需要的连续 UDP 端口数：ffmpeg RTP / ffmpeg RTCP。
 * mediasoup plainTransport 的本地端口不再由我们指定（交给 worker 的 PortManager
 * 在 rtcMinPort–rtcMaxPort 内自分配），所以这里不再为它预留端口。
 */
const PORTS_PER_TRACK = 2

/**
 * 判定「端口上是否已有监听者」的等待时长。
 * 空闲端口会在几毫秒内回 ICMP port-unreachable，60ms 足够覆盖回环延迟。
 */
const LISTEN_SETTLE_MS = 60

/**
 * 探测 socket `close()` 的兜底超时：正常回环下 'close' 事件毫秒级到达，
 * 这里只是防止极端情况下探测整体挂住。
 */
const CLOSE_FALLBACK_MS = 500

/**
 * 已被本进程“认领”的端口。
 * 探测本身不再占用端口（见 isUdpPortListening），这里只用于防止
 * 同一进程内（多房间并发申请）拿到同一段端口，释放时机见 releaseUdpPortBlock。
 */
const reservedPorts = new Set<number>()

/** 一路轨道分配到的端口段（仅 ffmpeg 侧，mediasoup 侧端口由 worker 自选） */
export type UdpPortBlock = {
  /** ffmpeg 监听 RTP 的端口（写入 SDP m-line） */
  ffmpegPort: number
  /** ffmpeg 监听 RTCP 的端口（写入 SDP a=rtcp） */
  ffmpegRtcpPort: number
  /** 本段占用的全部端口，用于释放 */
  ports: number[]
}

/**
 * 判断 host:port 上是否已有 UDP 监听者。
 *
 * ⚠️ 红线：这里**绝不能用 bind 探测**。bind 成功即代表本进程占住了该端口，
 * 必须 close 才能交还给真正的使用者；一旦 close 没执行（历史上就是
 * `dgram.Socket` 并没有 `isClosed()` 方法，异常被 catch 吞掉导致 socket 泄漏），
 * 探测方自己就会把整段端口占死，mediasoup `createPlainTransport` 必然 EADDRINUSE；
 * 即便 close 正常，bind→close 也留出了竞态窗口。
 *
 * 改用“向目标端口发一个空数据报”的方式：
 * - 端口无人监听 → 内核回 ICMP port-unreachable → socket 触发 `error`（ECONNREFUSED）；
 * - 端口有监听者 → 空包被投递，不会有任何 error，`settleMs` 后判定为已监听。
 *
 * 该方法不 bind 任何知名端口（只借用一个临时高位端口），探测结束立即 close，
 * 对 bind 语义的监听者（ffmpeg）与 mediasoup worker 同样有效，且不占用目标端口。
 */
function isUdpPortListening(port: number, host: string, settleMs = LISTEN_SETTLE_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    let settled = false
    let timer: NodeJS.Timeout | null = null

    const finish = (listening: boolean) => {
      if (settled) {
        return
      }
      settled = true
      if (timer) {
        clearTimeout(timer)
      }
      socket.removeAllListeners()
      // close() 释放 fd 是异步的：必须等 'close' 事件再返回，
      // 否则紧接着的真实使用者（ffmpeg / mediasoup）bind 同一端口会撞上 EADDRINUSE。
      let closed = false
      const done = () => {
        if (closed) {
          return
        }
        closed = true
        clearTimeout(closeTimer)
        resolve(listening)
      }
      const closeTimer = setTimeout(done, CLOSE_FALLBACK_MS)
      socket.once('close', done)
      try {
        socket.close()
      } catch {
        done()
      }
    }

    // 唯一预期的错误是 ICMP port-unreachable（ECONNREFUSED）= 端口空闲
    socket.once('error', () => finish(false))
    timer = setTimeout(() => finish(true), settleMs)

    try {
      socket.connect(port, host, () => {
        try {
          socket.send(Buffer.alloc(0))
        } catch {
          finish(false)
        }
      })
    } catch {
      finish(false)
    }
  })
}

/** 一组端口是否全部可用（没有任何监听者） */
async function areUdpPortsFree(ports: number[], host: string): Promise<boolean> {
  const results = await Promise.all(ports.map((port) => isUdpPortListening(port, host)))
  return results.every((listening) => !listening)
}

/**
 * 原子申请一段连续可用端口（ffmpeg rtp + rtcp 全部校验通过才返回）。
 *
 * 旧实现是 “findAvailableUdpPort() + k * 2”，既存在 bind 后 close 的竞态，
 * 也没有校验 k * 2 偏移后的端口是否真的空闲，多轨道/多房间并发时极易撞车。
 *
 * 默认段 40000–49000：与 mediasoup worker 的 rtcMinPort–rtcMaxPort（20000–39999）
 * 彻底分家，同时低于 macOS 临时端口起点（`net.inet.ip.portrange.first = 49152`），
 * 不会被 OS 当成出站临时端口抢走。
 */
export async function reserveUdpPortBlock(startPort = 40000, endPort = 49000, host = '127.0.0.1'): Promise<UdpPortBlock> {
  for (let base = startPort; base + PORTS_PER_TRACK - 1 <= endPort; base += PORTS_PER_TRACK) {
    const ports = [base, base + 1]
    if (ports.some((port) => reservedPorts.has(port))) {
      continue
    }
    if (await areUdpPortsFree(ports, host)) {
      ports.forEach((port) => reservedPorts.add(port))
      return { ffmpegPort: base, ffmpegRtcpPort: base + 1, ports }
    }
  }
  throw new Error(`No available UDP port block found between ${startPort} and ${endPort}`)
}

/** 释放端口段（幂等） */
export function releaseUdpPortBlock(block: { ports: number[] } | null | undefined) {
  block?.ports.forEach((port) => reservedPorts.delete(port))
}

/**
 * 等待某些 UDP 端口被“别的过程”绑定（用于确认 ffmpeg 已经建好收流 socket）。
 *
 * ffmpeg 的 SDP demuxer 会在打开输入时才 bind 端口，而 banner 等信息在此之前就已输出，
 * 因此不能拿 stderr 首行当“就绪”信号，否则会过早 connect 导致 RTP 全部丢失。
 *
 * 探测不占用目标端口（见 isUdpPortListening 的说明），因此轮询期间不会影响
 * ffmpeg 绑定，也不会与 mediasoup 的 plainTransport 抢端口。
 */
export async function waitForUdpPortBound(
  ports: number[],
  options: { timeoutMs?: number; intervalMs?: number; host?: string; aborted?: () => boolean } = {},
): Promise<number[]> {
  const { timeoutMs = 8000, intervalMs = 100, host = '127.0.0.1', aborted } = options
  const pending = new Set(ports)
  const bound: number[] = []
  const deadline = Date.now() + timeoutMs

  while (pending.size > 0 && Date.now() < deadline) {
    if (aborted?.()) {
      break
    }
    const targets = [...pending]
    const results = await Promise.all(targets.map((port) => isUdpPortListening(port, host)))
    targets.forEach((port, index) => {
      if (results[index]) {
        bound.push(port)
        pending.delete(port)
      }
    })
    if (pending.size === 0) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return bound
}
