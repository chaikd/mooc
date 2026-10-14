import type { Consumer, Producer, RtpCapabilities, WebRtcTransport } from 'mediasoup/types'
import type { HlsState } from '../media-pipeline/hls-pipeline.ts'

/** 房间运行态 */
export type RoomState = 'idle' | 'live' | 'closing' | 'closed'

/** producer 轨道类型，来自客户端 appData.type（camera / microphone / screen-*） */
export type ProducerTrackType = string

export type ProducerRecord = {
  producerId: string
  producer: Producer
  /** 推流者 socketId */
  socketId: string
  kind: 'audio' | 'video'
  type: ProducerTrackType
}

/** 单个 socket 在房间内的会话 */
export type SessionRecord = {
  socketId: string
  sendTransport?: WebRtcTransport
  recvTransport?: WebRtcTransport
  rtpCapabilities?: RtpCapabilities
  /** 该会话是否推送过流（用于保持"推流者离开则整房流关闭"的现有语义） */
  hasPublished: boolean
}

export type RoomMetrics = {
  roomId: string
  state: RoomState
  sessionCount: number
  producerCount: number
  consumerCount: number
  hlsState: HlsState
  /** HLS 旁路可观测性：第三方取址失败时靠这几个字段定位 */
  hlsReady?: boolean
  hlsTracks?: number
  hlsPid?: number
  hlsFailures?: number
  hlsRestarts?: number
  hlsLastError?: string
}

/** 房间向客户端广播的事件名（与前端协议保持一致） */
export type RoomBroadcastEvent =
  | 'newProduce'
  | 'producerClosed'
  | 'liveEnded'
  | 'ffmpegReady'
  | 'ffmpegStoped'
  | 'liveRoomInfo'

export type RoomEmitter = (event: RoomBroadcastEvent, payload?: unknown) => void

/** 供 HLS 管道挑选参与混流的 producer */
export type HlsProducerItem = {
  producer: Producer
  type: ProducerTrackType
}

export type ConsumerParams = {
  id: string
  producerId: string
  kind: 'audio' | 'video'
  rtpParameters: Consumer['rtpParameters']
}
