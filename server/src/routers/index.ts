import { Express } from 'express';
import authRouter from './auth'
import userRouter from './user'
import roleRouter from './role'
import permissionRouter from './permission'
import courseRouter from './course'
import qiniuRouter from './qiniu'
import informationRouter from './information'
import liveRouter from './live'

const whiteList = [
  '/api/auth/regist',
  '/api/auth/login',
  '/hls'
]

export const isWhiteList = (url: string): boolean => {
  return (
    whiteList.some(v => url.startsWith(v))
  )
}

export default function registRouters(app: Express) {
  app.use('/api/auth',authRouter)
  app.use('/api/user',userRouter)
  app.use('/api/role',roleRouter)
  app.use('/api/permission',permissionRouter)
  app.use('/api/course',courseRouter)
  app.use('/api/qiniu',qiniuRouter)
  app.use('/api/information', informationRouter)
  app.use('/api/live', liveRouter)
}
