import mongoose from "mongoose";
import { RoleType } from "./role.ts";
const { model, Schema } = mongoose

export interface UserType {
  _id?: string;
  username: string;
  password: string;
  role: string;
  roleCode: string
  createTime: Date;
  roleInfo?: RoleType;
}

const userSchema = new Schema<UserType>({
  username: {type: String, unique: true},
  password: String,
  role: String,
  roleCode: String,
  createTime: Date
})

const User = mongoose.models.user || model<UserType>('user', userSchema)

export default User