import { NextFunction, Response } from "express"
import { isSystemAdmin } from "../services/permission.ts"
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

export const checkPromssion = async (
  req: RequestTypeWithJWT,
  res: Response,
  next: NextFunction,
) => {
  if (noPromissionAuth(req.url)) {
    next()
    return
  }

  if (!req.userId) {
    res.status(401).json({ message: '暂无权限' })
    return
  }

  try {
    if (await isSystemAdmin(req.userId)) {
      next()
      return
    }

    res.status(403).json({ message: '暂无权限' })
  } catch (error) {
    next(error)
  }
}
