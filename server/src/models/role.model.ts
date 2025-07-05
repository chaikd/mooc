import { model, Schema } from "mongoose";

export interface RoleType {
  _id?: string;
  name: String,
  createTime: Date,
  createUserId: String
  editUserId: String
  permissions: String
}

const roleSchema = new Schema({
  name: String,
  createTime: Date,
  createUserId: String,
  editUserId: String,
  permissions: String
})

const Role = model<RoleType>('role',roleSchema)

export default Role