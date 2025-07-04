import { Express } from 'express';
import authRouter from './auth'
import userRouter from './user'
import roleRouter from './role'
import permissionRouter from './permission'

const whiteList = [
  '/regist',
  '/login'
]

export const isWhiteList = (url: string): boolean => {
  return url.startsWith('/api/auth') && whiteList.some(v => url.includes(v))
}

export default function registRouters(app: Express) {
  app.use('/api/auth',authRouter)
  app.use('/api/user',userRouter)
  app.use('/api/role',roleRouter)
  app.use('/api/permission',permissionRouter)
}
