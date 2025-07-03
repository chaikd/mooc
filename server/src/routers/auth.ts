import { Router, Response, Request } from "express";
import { md5 } from "@/utils/md5";
import { generateToken } from "@/public/jwt";
import { createUser, findOneUser } from "@/models/user.model";
const router = Router()

type UserCreateInput = {
  id?: string
  username: string
  password: string
  role?: string
}

router.post('/regist', async (_req: Request, _res: Response) => {
  const userInfo: UserCreateInput = _req.body
  const hasUsername = await findOneUser({username: userInfo.username})
  if(hasUsername) {
    _res.status(403).json({
      success: false,
      message: '重复的用户名'
    })
    return
  }
  await createUser({
    ...userInfo,
    password: md5(userInfo.password),
    role: 'student'
  }).then(() => {
    _res.json({
      message: '注册成功',
      success: true
    })
  }).catch(err => {
    _res.status(500).json(err)
  })
})

router.post('/login',async (_req: Request, _res: Response) => {
  const reqUser: UserCreateInput = _req.body as UserCreateInput
  const userInfo: UserCreateInput | null = await findOneUser({username: reqUser.username, password: md5(reqUser.password)})
  if (userInfo?.id) {
    const token = generateToken(userInfo.id)
    _res.cookie('authorization', token, {
      maxAge: 24*60*60 * 1000,
      httpOnly: true
    }).json({
      success: true,
      token,
      userId: userInfo.id,
      message: '登陆成功'
    })
  } else {
    _res.status(405).json({
      message: '用户名或密码错误'
    })
  }
})

router.get('/logout', (_req: Request, _res: Response) => {
  _res.cookie('authorization', '', {
    maxAge: 0
  }).json({
    success: true,
    message: '退出成功'
  })
})

export default router