import { logger } from '@mooc/db-shared/index.ts'
import { type ChildProcess, spawn } from 'child_process'
import { mkdirSync, readFileSync, rm, rmSync } from 'fs'
import { join } from 'path'
import type { PlainTransportListItemType } from '../mediasoup/transcoder.ts'

/** HLS 输出根目录，需与 app.ts 中 `/hls` 静态目录保持一致 */
function hlsOutputDir(roomId: string) {
  return join(process.cwd(), 'tmp', 'hls', roomId)
}

/** 播放列表可访问地址（前端 m3u8 播放地址） */
export function hlsPlaylistUrl(roomId: string) {
  return `/hls/${roomId}/playlist_live.m3u8`
}

export type FFmpegExitInfo = {
  code: number | null
  signal: NodeJS.Signals | null
  intentional: boolean
  /** 退出前最后若干行 stderr，用于定位失败原因（此前 ffmpeg 日志只落 verbose，线上完全黑盒） */
  logs: string[]
}

export type FFmpegProcessHooks = {
  /** 进程退出（含被主动 stop），只会回调一次 */
  onExit?: (info: FFmpegExitInfo) => void
}

/** ffmpeg 的进度行（frame= ... fps= ...）每 0.5s 刷新一次，无诊断价值且会淹没日志 */
const PROGRESS_LINE = /^frame=\s*\d+\s+fps=/
/** 相同日志行的去重窗口，避免刷屏 */
const LOG_DEDUPE_MS = 2000
/** 保留的最近 stderr 行数 */
const LOG_TAIL_SIZE = 20
/** stop() 发出 SIGTERM 后等待退出的时长，超时升级 SIGKILL */
const STOP_TERM_WAIT_MS = 2000
/** SIGKILL 后的兜底等待上限（信号本身不可捕获，这里只是防止 await 永挂） */
const STOP_KILL_WAIT_MS = 10000

/**
 * 单路 FFmpeg 旁路转码进程
 *
 * 只负责"进程 + 输出目录 + 日志"，不理解房间语义；
 * plain transport 的创建/回收与 `connect()` 时机由 HlsPipeline 负责。
 */
export class FFmpegProcess {
  private child?: ChildProcess
  private exited = false
  private intentionalStop = false
  private readonly dir: string
  private readonly lastLogAt = new Map<string, number>()
  private readonly logs: string[] = []

  constructor(
    private readonly roomId: string,
    private readonly plainTransportList: PlainTransportListItemType[],
    private readonly hooks: FFmpegProcessHooks = {},
  ) {
    this.dir = hlsOutputDir(roomId)
  }

  get pid() {
    return this.child?.pid
  }

  /** 本进程需要 ffmpeg 监听的 UDP 端口（RTP + RTCP），供 HlsPipeline 做就绪探测 */
  get listenPorts(): number[] {
    return this.plainTransportList.flatMap((item) => [item.ffmpegPort, item.ffmpegRtcpPort])
  }

  isAlive() {
    if (!this.child || this.exited) {
      return false
    }
    return this.child.exitCode === null && this.child.signalCode === null
  }

  /**
   * 播放列表里 `#EXTINF` 条目数——"本代真的写出了分片"的硬信号。
   * 目录在 spawn 前清空，所以条目存在即属于本进程；文件不存在/未写完返回 0。
   */
  segmentCount(): number {
    let text = ''
    try {
      text = readFileSync(join(this.dir, 'playlist_live.m3u8'), 'utf8')
    } catch {
      return 0
    }
    return (text.match(/^#EXTINF/gm) ?? []).length
  }

  start() {
    if (this.child) {
      throw new Error(`FFmpegProcess already started for room ${this.roomId}`)
    }
    // spawn 前无条件清空目录：让"目录里的 playlist/分片"与"本代写出的产物"等价。
    // 旧实现保留上一代产物 + existsSync 判就绪，是 418ms 假就绪的源头（方案 3.23/3.25）。
    rmSync(this.dir, { recursive: true, force: true })
    mkdirSync(this.dir, { recursive: true })
    const sdpText = generateRtpSdp(this.plainTransportList)
    const child = spawn('ffmpeg', buildFfmpegArgs(this.dir))
    this.child = child

    logger.info({
      message: 'ffmpeg spawning',
      roomId: this.roomId,
      pid: child.pid,
      ports: this.plainTransportList.map((item) => ({
        rtp: item.ffmpegPort,
        rtcp: item.ffmpegRtcpPort,
        from: item.plainRtpPort,
      })),
      sdp: sdpText.replace(/\r\n/g, '\n'),
    })

    child.stdin.on('error', (error) => {
      // ffmpeg 提前退出时写 SDP 会 EPIPE，必须吃掉，否则变成 uncaught exception 打挂进程
      logger.warn({
        message: 'ffmpeg stdin write failed',
        roomId: this.roomId,
        pid: child.pid,
        error: (error as Error).message,
      })
    })
    child.stdin.write(sdpText)
    setImmediate(() => {
      if (!child.stdin.destroyed) {
        child.stdin.end()
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split(/[\r\n]+/)) {
        this.handleStderrLine(line.trim())
      }
    })

    child.on('error', (error) => {
      logger.error({ message: 'ffmpeg spawn error', roomId: this.roomId, error: error.message })
      this.notifyExit({ code: null, signal: null, intentional: false })
    })

    child.on('close', (code, signal) => {
      this.notifyExit({ code, signal, intentional: this.intentionalStop })
    })
  }

  /**
   * 主动停止（不会触发意外退出告警）。
   * ffmpeg 可能卡在 `-listen` 的阻塞读里而无视 SIGTERM，因此有界等待后升级 SIGKILL，
   * 返回即代表"已确认退出"——这是管道重建时"单一写者"的前提（方案 3.25 不变量 1）。
   */
  async stop(): Promise<void> {
    const child = this.child
    if (!child || this.exited) {
      return
    }
    this.intentionalStop = true
    child.kill('SIGTERM')
    if (await this.waitExit(child, STOP_TERM_WAIT_MS)) {
      return
    }
    logger.warn({ message: 'ffmpeg ignored SIGTERM, escalating to SIGKILL', roomId: this.roomId, pid: child.pid })
    child.kill('SIGKILL')
    if (!(await this.waitExit(child, STOP_KILL_WAIT_MS))) {
      logger.error({ message: 'ffmpeg still alive after SIGKILL', roomId: this.roomId, pid: child.pid })
    }
  }

  private waitExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (this.exited) {
      return Promise.resolve(true)
    }
    return new Promise((resolve) => {
      const onClose = () => {
        clearTimeout(timer)
        resolve(true)
      }
      const timer = setTimeout(() => {
        child.removeListener('close', onClose)
        resolve(false)
      }, timeoutMs)
      child.once('close', onClose)
    })
  }

  /** 进程退出后清理输出目录 */
  removeOutput() {
    rm(this.dir, { recursive: true, force: true }, (error) => {
      if (error) {
        logger.warn({ message: 'hls output remove failed', roomId: this.roomId, error: error.message })
      }
    })
  }

  private handleStderrLine(line: string) {
    if (!line) {
      return
    }
    if (PROGRESS_LINE.test(line)) {
      return
    }
    const now = Date.now()
    const key = line.replace(/\d+/g, '#')
    if (now - (this.lastLogAt.get(key) ?? 0) < LOG_DEDUPE_MS) {
      return
    }
    this.lastLogAt.set(key, now)
    this.logs.push(line)
    if (this.logs.length > LOG_TAIL_SIZE) {
      this.logs.shift()
    }
    logger.info({ message: 'ffmpeg stderr', roomId: this.roomId, pid: this.child?.pid, line })
  }

  private notifyExit(info: { code: number | null; signal: NodeJS.Signals | null; intentional: boolean }) {
    if (this.exited) {
      return
    }
    this.exited = true
    logger.info({
      message: 'ffmpeg exited',
      roomId: this.roomId,
      pid: this.child?.pid,
      code: info.code,
      signal: info.signal,
      intentional: info.intentional,
      logs: this.logs,
    })
    this.hooks.onExit?.({ ...info, logs: [...this.logs] })
  }
}

/**
 * FFmpeg 参数
 *
 * 关键约束（改动前请确认）：
 * - 所有 `.D.`（demuxing）选项必须放在 `-i` 之前，否则不会作用到输入：
 *   `-listen_timeout` / `-reorder_queue_size` / `-probesize` / `-analyzeduration` 都是输入选项。
 * - `-listen_timeout` 默认 10 秒：如果这 10 秒内 SDP 声明的端口上没有 RTP 到达，
 *   ffmpeg 直接超时退出（线上表现：启动约 9.9 秒后 exited code 187）。
 *   端口就绪由 HlsPipeline 探测后再 `plainTransport.connect()`，这里把窗口放宽到 30 秒兜底。
 * - `-vsync` 已废弃（8.x 会告警），改用 `-fps_mode`。
 */
function buildFfmpegArgs(dir: string): string[] {
  const fileId = 'live'
  return [
    '-hide_banner',
    '-loglevel', 'info',

    // ── 输入选项：必须在 -i 之前 ──────────────────────────
    '-protocol_whitelist', 'file,udp,rtp,pipe',
    '-listen_timeout', '30',
    '-reorder_queue_size', '2000',
    '-probesize', '50000000',
    // 5 秒（不是 50 秒）：某条轨道静音时不至于把出片时间一起拖住
    '-analyzeduration', '5000000',
    // 不加 -use_wallclock_as_timestamps：实测在 `-f sdp` 上是 no-op。
    // 该选项只属于 AVFormatContext 通用表，`-f sdp` 的 demuxer（sdp/rtp）的 AVOptions
    // 清单里都没有它；而 `-f sdp` 会为每条 m= 行再 avformat_open_input 一个内层 rtp 子上下文，
    // 选项只落在外层 sdp 上下文上、不会下发给真正打时间戳的内层。
    // 音频时间戳的实际问题出在 Opus DTX（静音期不发包），由输出侧 aresample=async 处理。
    '-f', 'sdp',
    '-i', 'pipe:0',

    // ── 输出选项 ─────────────────────────────────────────
    '-map', '0',
    '-c:v', 'libx264',
    '-c:a', 'aac',

    '-crf', '23', // 恒定质量，平衡质量和性能
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-profile:v', 'main',
    '-level:v', '3.1',
    '-b:v', '1500k',
    '-maxrate', '2000k',
    '-bufsize', '4000k',
    '-keyint_min', '30',
    '-sc_threshold', '0', // 禁用场景检测
    '-g', '60',
    '-r', '30',
    '-f', 'hls',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2',
    // 显式偶数尺寸 + 显式像素格式：
    // force_original_aspect_ratio=decrease 会按源宽高比回算另一条边，
    // 屏幕共享常见源尺寸（如 3024x1534）会算出奇数高度 649，
    // libx264 + yuv420p 直接报 "height not divisible by 2" 并一帧都写不出。
    // 这里用第二级 scale 的 trunc/2*2 取偶，而不是 scale 的 force_divisible_by=2，
    // 以兼容 ffmpeg < 4.3 的部署环境。
    //
    // 不用 setpts/asetpts=PTS-STARTPTS 归零：它给每条轨各减去"本轨首包时刻"。
    // 静音空洞下音频轴可以远早于视频轴建立（实测 audio_start≈290s / video_start≈252s），
    // 归零反而人为制造出秒级偏移。控制实验证明有声源时原生对齐已在 0.03s 内。
    '-pix_fmt', 'yuv420p',
    '-fps_mode', 'cfr',
    // 音频跟随视频主时钟重采样：Opus DTX 静音期不发包会造成音频时间戳冻结，
    // 分片里只剩 1~10 个 AAC 帧（正常约 190 个），播放器容易爆音/卡住。
    // async=1 在缺口处补静音、把跳跃拉回。
    // first_pts=0：补偿基准归零。实测只写 async=1 时，启动期的静音空洞会被攒成
    // 一次性 36 秒的"硬补"（一个 4 秒分片里塞进 1722 个 AAC 帧），比不补更糟；
    // 归零后以输出时间轴的 0 点为基准逐帧对齐，避免攒批。
    '-af', 'aresample=48000:async=1:first_pts=0',

    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',

    '-pkt_size', '1316',
    '-fflags', 'nobuffer+genpts+discardcorrupt',
    '-flags', 'low_delay',
    '-max_delay', '2000000',

    '-hls_time', '4',
    '-hls_list_size', '15',
    // temp_file：分片与 playlist 先写 .tmp 再改名，原子落盘，观众拉不到半截分片；
    // omit_endlist：直播期不追加 #EXT-X-ENDLIST，播放器按 HLS 语义持续重拉滚动；
    // append_list 已移除：分片编号每代从 1 重开，杜绝僵尸进程向旧 playlist 续写（3.25 不变量 1）
    '-hls_flags', 'delete_segments+temp_file+omit_endlist',
    '-hls_segment_filename',
    join(dir, `segment_${fileId}_%03d.ts`),
    join(dir, `playlist_${fileId}.m3u8`),
  ]
}

/**
 * 生成一段最小 SDP，供 FFmpeg `-f sdp -i pipe:0` 读取
 */
function generateRtpSdp(plainTransportList: PlainTransportListItemType[]) {
  const sdp: string[] = [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=mediasoup-stream',
    't=0 0',
  ]

  plainTransportList.forEach((item) => {
    const codec = item.consumer.rtpParameters.codecs[0]
    const payloadType = codec.payloadType
    const type = codec.mimeType.split('/')[0]
    const codecName = codec.mimeType.split('/')[1]
    const clockRate = codec.clockRate
    const fmtp = codec.parameters
      ? Object.entries(codec.parameters).map(([k, v]) => `${k}=${v}`).join(';')
      : ''
    const encoding = item.consumer.rtpParameters.encodings?.[0]
    const rtcpCname = item.consumer.rtpParameters.rtcp?.cname
    sdp.push(...[
      '',
      `m=${type} ${item.ffmpegPort} RTP/AVP ${payloadType}`,
      `c=IN IP4 127.0.0.1`,
      `a=rtpmap:${payloadType} ${codecName}/${clockRate}`,
      fmtp ? `a=fmtp:${payloadType} ${fmtp}` : '',
      `a=ssrc:${encoding?.ssrc} cname:${rtcpCname || 'mediasoup'}`,
      'a=recvonly',
      // 不写 a=framesize：真实尺寸由 RTP 流内的 SPS 决定，
      // 硬编码一个与源无关的 640-480 只会让 ffmpeg 前期猜错并刷探测告警。
      `a=rtcp:${item.ffmpegRtcpPort} IN IP4 127.0.0.1`,
    ])
  })
  return sdp.join('\r\n')
}
