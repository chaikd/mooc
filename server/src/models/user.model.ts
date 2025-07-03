import { model, Schema } from "mongoose"

export interface UserType {
  _id?: string;
  username: string;
  password: string;
  role: string;
}

const userSchema = new Schema<UserType>({
  username: {type: String, unique: true},
  password: String,
  role: String
})

const User = model<UserType>('User', userSchema)

const createUser = (data: UserType) => {
  return User.create(data)
}

const findOneUser = (data: Partial<UserType>) => {
  return User.findOne(data)
}

export {
  createUser,
  findOneUser
}

export default User