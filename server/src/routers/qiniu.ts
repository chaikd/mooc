import {uploadQiniuToken} from "@/utils/qiniu"
import {Router, Request, Response} from "express"
const router = Router()

router.get('/token', async (req: Request, res: Response) => {
  const token = await uploadQiniuToken('mainmooc')
  res.json({
    success: true,
    data: token
  })
})

export default router