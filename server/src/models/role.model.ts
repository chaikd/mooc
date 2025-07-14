import { model, Schema } from "mongoose";

export interface RoleType {
  _id?: string;
  name: string,
  createTime: Date,
  createUserId: string
  editUserId: string
  permissions: string | string[]
  code: string
}

const roleSchema = new Schema({
  name: String,
  createTime: Date,
  createUserId: String,
  editUserId: String,
  permissions: String,
  code: String
})

const Role = model<RoleType>('role',roleSchema)

export default Role