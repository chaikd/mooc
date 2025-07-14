import { Router, Request, Response } from 'express';
import { Live } from '@/models/live';
import { createDoc, findOneDoc, findDocs, updateDoc, deleteDoc, countDocs, findAll } from '@/servers/mongo/actions';
import { User } from '@/models';

const router = Router();

// 直播列表
router.get('/list', async (req: Request, res: Response) => {
  const { size = 10, page = 1, ...filter } = req.query;
  const limit = Number(size);
  const skip = Number(page);
  // 按 startTime 降序排序
  const sortConfig = {}
  let lives = await Live.find(filter)
    .sort(sortConfig)
    .limit(limit)
    .skip((skip - 1) * limit);
  const userIds = lives.map(v => v.instructorId)
  let instructorMap: Record<string, any> = {};
  if (userIds?.length > 0) {
    const users = await User.find({ _id: { $in: userIds }}, 'username')
    users.reduce<Record<string, any>>((pre, cur) => {
      const id = cur._id as string
      pre[id] = cur.username
      return pre
    }, instructorMap)
  }
  let data = lives.map(v => {
    const obj = {
      ...v.toObject(),
      instructorName: instructorMap[String(v.instructorId)]
    }
    return obj
  })
  const total = await countDocs(Live, filter);
  res.json({ success: true, data: { data, total, page: Number(page), size: limit } });
});

// 新增直播
router.post('/add', async (req: Request, res: Response) => {
  const live = await createDoc(Live, req.body);
  res.json({ success: true, data: live });
});

// 编辑直播
router.post('/edit', async (req: Request, res: Response) => {
  const { _id, ...data } = req.body;
  const live = await updateDoc(Live, _id, data);
  res.json({ success: true, data: live });
});

// 删除直播
router.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body;
  const result = await deleteDoc(Live, id);
  res.json({ success: true, data: result });
});

// 获取单个直播详情
router.get('/:id', async (req: Request, res: Response) => {
  const live = await findOneDoc(Live, { _id: req.params.id });
  res.json({ success: true, data: live });
});

export default router;
