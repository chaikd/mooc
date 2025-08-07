import mongoose from "mongoose";
const { model, Schema } = mongoose
export interface PermissionType {
  _id?: string,
  parentId: string,
  code: string,
  name: string,
  createTime: Date,
  createUserId: string,
  type: 'menu' | 'button' | 'api'
}

const permissionSchema = new Schema<PermissionType>({
  parentId: { type: String, default: null },
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, default: 'menu' },
  createTime: Date,
  createUserId: String,
})

const Permission = mongoose.models.permission || model('permission',permissionSchema)

export default Permission