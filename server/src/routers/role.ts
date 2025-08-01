import { Router, Request, Response } from 'express';
import {Role, User, mdaction} from '@mooc/db-shared';

const router = Router();

// 获取角色列表（支持分页）
router.get('/list', async (req: Request, res: Response) => {
  const { size = 10, page = 0, ...filter } = req.query;
  const roles = await mdaction.findDocs(Role, filter, Number(size), Number(page));
  const total = await mdaction.countDocs(Role, filter)
  // 查询所有涉及到的用户
  const userIds = Array.from(new Set(roles.map(r => r.createUserId).filter(Boolean)));
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const users = await User.find({ _id: { $in: userIds } }, 'username');
    userMap = users.reduce<Record<string, string>>((acc, cur) => {
      acc[String(cur._id)] = cur.username;
      return acc;
    }, {});
  }
  const rolesWithUsername = roles.map(r => ({
    ...r.toObject(),
    permissions: r.permissions ? (r.permissions as string).split(',') : [],
    createUsername: userMap[String(r.createUserId)] || '',
    editUsername: userMap[String(r.editUserId)] || '',
  }));
  res.json({ success: true, data: {
    data: rolesWithUsername,
    size,
    page,
    total,
    ...filter
  } });
});

// 新增角色
router.post('/add', async (req: Request, res: Response) => {
  const role = await mdaction.createDoc(Role, req.body);
  res.json({ success: true, data: role });
});

// 编辑角色
router.post('/edit', async (req: Request, res: Response) => {
  const { _id, ...data } = req.body;
  const role = await mdaction.updateDoc(Role, _id, data);
  res.json({ success: true, data: role });
});

// 删除角色
router.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body;
  const result = await mdaction.deleteDoc(Role, id);
  res.json({ success: true, data: result });
});

// 查询单个角色
router.get('/info', async (req: Request, res: Response) => {
  const { _id } = req.query;
  if(_id) {
    const role = await mdaction.findOneDoc(Role, { _id: String(_id) });
    res.json({ success: true, data: role });
  }
});

export default router;
