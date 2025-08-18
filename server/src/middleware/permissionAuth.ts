import { NextFunction, Response } from "express"
import { RequestTypeWithJWT } from "./jwt/index.ts"

const needPromissionUrls = [
  '/api/user/add',
  '/api/user/edit',
  '/api/user/delete',
  '/api/role/add',
  '/api/role/edit',
  '/api/role/delete',
  '/api/permission/add',
  '/api/permission/edit',
  '/api/permission/delete',
  '/api/course/status',
]

export const noPromissionAuth = (url: string): boolean => {
  return !(needPromissionUrls.includes(url) || needPromissionUrls.some(u => {
    return url.startsWith(u)
  }))
}

export const checkPromssion = (req: RequestTypeWithJWT, res: Response, next: NextFunction) => {
  console.log(noPromissionAuth(req.url))
  console.log(req.url)
  if(noPromissionAuth(req.url)) {
    next()
  } else {
    return res.status(403).json({ message: '暂无权限' })
  }
}