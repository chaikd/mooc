import { model, Schema } from "mongoose"

export interface UserType {
  _id?: string;
  username: string;
  password: string;
  role: string;
  roleCode: String
  createTime: Date;
}

const userSchema = new Schema<UserType>({
  username: {type: String, unique: true},
  password: String,
  role: String,
  roleCode: String,
  createTime: Date
})

const User = model<UserType>('user', userSchema)

export default User