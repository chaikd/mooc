import { Express } from 'express';
import authRouter from './auth.ts';
import courseRouter from './course/index.ts';
import informationRouter from './information.ts';
import liveRouter from './live.ts';
import permissionRouter from './permission.ts';
import qiniuRouter from './qiniu.ts';
import roleRouter from './role.ts';
import userRouter from './user.ts';

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
