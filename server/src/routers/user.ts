import {Role, User} from "@/models";
import { RoleType } from "@/models/role.model";
import { UserType } from "@/models/user.model";
import { md5 } from "@/utils";
import { createDoc, deleteDoc, findDocs, findOneDoc, updateDoc, countDocs, findAll } from "@/utils/database/actions";
import { Response, Request, Router } from "express";

// type Req = Request & {userId: string}
const router = Router()
router.get('/selfinfo', async (req: Request & {userId?: string}, res: Response) => {
  const userId = req.userId
  const _id = userId
  if(!_id) {
    res.json({
      success: false,
      message: '请传入用户id'
    })
  }
  const userInfo = await findOneDoc(User, {_id}, 'username createTime _id role')
  let result: UserType | null = null
  if(userInfo?.role) {
    const role = await findOneDoc(Role, {_id: userInfo.role})
    if (role) {
      result = userInfo.toObject()
      result.roleInfo = {
        ...role.toObject(),
        permissions: (role.permissions as string).split(',')
      }
    }
  }
  if(result || userInfo) {
    res.json({
      success: true,
      data: result || userInfo
    })
  } else {
    res.json({
      success: false,
      message: '查找的用户不存在'
    })
  }
})

// server/src/routers/user.ts
router.get('/list', async (req: Request, res: Response) => {
  const limit = Number(req.query.size)
  const skip = Number(req.query.page)
  const filter = {...req.query}
  Reflect.deleteProperty(filter, 'size')
  Reflect.deleteProperty(filter, 'page')
  const users = await findDocs(User, filter, limit, skip, 'username role createTime _id')
  const total = await countDocs(User, filter)
  res.json({ success: true, data: {
    data: users,
    total,
    ...req.query
  } });
})

router.post('/add', async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  const exist = await findOneDoc(User, { username });
  if (exist) {
    res.json({ success: false, message: '用户名已存在' })
  }else {
    const theRole = await findOneDoc(Role, {_id: role}) as RoleType
    const user = await createDoc(User, { username, password: md5(password), role, roleCode: theRole.code });
    res.json({ success: true, data: user });
  }
})

router.post('/edit', async (req: Request, res: Response) => {
  const {_id, ...reqData} = req.body
  const exist = await findOneDoc(User, {_id})
  if(exist) {
    if(!exist.roleCode) {
      const theRole = await findOneDoc(Role, {_id: exist.role}) as RoleType
      exist.roleCode = theRole.code
    }
    const data = {
      ...exist.toObject(),
      ...reqData,
    }
    await updateDoc(User, _id, data)
    res.json({success: true, data })
  } else {
    res.json({success: false, message: '用户不存在'})
  }
})

router.delete('/delete', async (req: Request, res: Response) => {
  const _id = req.body._id
  const exist = await findOneDoc(User, {_id})
  if(exist) {
    await deleteDoc(User, _id)
    res.json({success: true })
  } else {
    res.json({success: false, message: '用户不存在'})
  }
})

router.get('/list/type', async (req: Request, res: Response) => {
  const {...filter} = req.query
  const datas = await findAll(User, filter)
  if(datas) {
    res.json({success: true, data: datas})
  } else {
    res.json({success: false, message: '请求有误'})
  }
})

export default router