import { findOneUser } from "@/models/user.model";
import { Response, Request, Router } from "express";

// type Req = Request & {userId: string}
const router = Router()
router.get('/selfinfo', async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const _id = userId
  if(!_id) {
    res.json({
      success: false,
      message: '请传入用户id'
    })
  }
  const userInfo = await findOneUser({_id})
  if(userInfo) {
    res.json({
      success: true,
      data: {...userInfo}
    })
  } else {
    res.json({
      success: false,
      message: '查找的用户不存在'
    })
  }
})

export default router