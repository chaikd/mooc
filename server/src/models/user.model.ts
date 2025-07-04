import { model, Schema } from "mongoose"

export interface UserType {
  _id?: string;
  username: string;
  password: string;
  role: string;
  createTime: Date;
}

const userSchema = new Schema<UserType>({
  username: {type: String, unique: true},
  password: String,
  role: String,
  createTime: Date
})

const User = model<UserType>('user', userSchema)

export default User