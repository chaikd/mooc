import { Router, Request, Response } from 'express';
import { Information, InformationTypeModel, mdaction } from '@mooc/db-shared';

const router = Router();

// 资料类型列表
router.get('/type/list', async (req: Request, res: Response) => {
  const { size = 100, page = 1, ...filter } = req.query;
  const limit = Number(size);
  const skip = Number(page);
  const types = await mdaction.findDocs(InformationTypeModel, filter, limit, skip);
  const total = await mdaction.countDocs(InformationTypeModel, filter);
  res.json({ success: true, data: { data: types, total, page: Number(page), size: limit } });
});

// 新增资料类型
router.post('/type/add', async (req: Request, res: Response) => {
  const type = await mdaction.createDoc(InformationTypeModel, req.body);
  res.json({ success: true, data: type });
});

// 编辑资料类型
router.post('/type/edit', async (req: Request, res: Response) => {
  const { _id, ...data } = req.body;
  const type = await mdaction.updateDoc(InformationTypeModel, _id, data);
  res.json({ success: true, data: type });
});

// 删除资料类型
router.post('/type/delete', async (req: Request, res: Response) => {
  const { id } = req.body;
  const result = await mdaction.deleteDoc(InformationTypeModel, id);
  res.json({ success: true, data: result });
});

// 资料列表
router.get('/list', async (req: Request, res: Response) => {
  const { size = 10, page = 1, ...filter } = req.query;
  const limit = Number(size);
  const skip = Number(page);
  const infos = await mdaction.findDocs(Information, filter, limit, skip);
  const total = await mdaction.countDocs(Information, filter);
  res.json({ success: true, data: { data: infos, total, page: Number(page), size: limit } });
});

// 新增资料
router.post('/add', async (req: Request, res: Response) => {
  const info = await mdaction.createDoc(Information, req.body);
  res.json({ success: true, data: info });
});

// 编辑资料
router.post('/edit', async (req: Request, res: Response) => {
  const { _id, ...data } = req.body;
  const info = await mdaction.updateDoc(Information, _id, data);
  res.json({ success: true, data: info });
});

// 删除资料
router.post('/delete', async (req: Request, res: Response) => {
  const { id } = req.body;
  const result = await mdaction.deleteDoc(Information, id);
  res.json({ success: true, data: result });
});

// 批量新增资料类型
router.post('/type/batchAdd', async (req: Request, res: Response) => {
  try {
    const { list } = req.body;
    if (!Array.isArray(list) || list.length === 0) {
      res.json({ success: false, message: '参数list不能为空' });
      return;
    }
    const result = await InformationTypeModel.insertMany(list);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '批量新增资料类型失败', error });
  }
});

// 批量新增资料
router.post('/batchAdd', async (req: Request, res: Response) => {
  try {
    const { list } = req.body;
    if (!Array.isArray(list) || list.length === 0) {
      res.json({ success: false, message: '参数list不能为空' });
      return;
    }
    console.log(list)
    const result = await Information.insertMany(list);
    console.log(result)
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '批量新增资料失败', error });
  }
});

export default router;
