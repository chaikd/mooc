import { model, ObjectId, Schema } from "mongoose";

interface LiveType {
  _id?: string
  title: string
  description: string
  instructorId: ObjectId
  createUserId: ObjectId
  status: 'scheduled' | 'live' | 'ended'
  startTime: Date
  endTime: Date
  createTime: Date
  liveDataId: string
  roomToken: string
  chatEnabled: boolean // 是否开启聊天
  maxViewerCount: number // 最大在线人数
  recordEnabled: boolean // 是否录播
  recordUrl: string // 录播回放地址
}

const LiveSchema = new Schema<LiveType>({
  title: String,
  description: String,
  instructorId: { type: Schema.Types.ObjectId, ref: 'User' },
  createUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended'],
    default: 'scheduled',
  },
  startTime: Date,
  endTime: Date,
  roomToken: String, // 用于 join 权限验证
  recordEnabled: { type: Boolean, default: false },
  recordUrl: String, // 回放地址（可选）
  createTime: { type: Date, default: Date.now },
})

const Live = model('live',LiveSchema)

export {
  Live
}