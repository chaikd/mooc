import { Express } from 'express';
import authRouter from './auth'
import userRouter from './user'

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
}
