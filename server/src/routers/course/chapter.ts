import { Router, Request, Response } from 'express';
import { CursorChapter, Information } from '@/models';
import { CursorChapterType } from '@/models/course';
import { createDoc, findOneDoc, findDocs, updateDoc, deleteDoc, countDocs, findAll } from '@/utils/database/actions';
import { InformationType } from '@/models/information';

const router = Router();

// 获取章节列表（可按课程ID和父章节ID筛选）
router.get('/tree/:courseId', async (req: Request, res: Response) => {
  const { courseId, parentChapterId } = req.params;
  try {
    const filter: any = {};
    if (courseId) filter.courseId = courseId;
    if (parentChapterId !== undefined) filter.parentChapterId = parentChapterId;
    let chapters: Array<CursorChapterType & Partial<{materials: Array<InformationType>}>> = await findAll(CursorChapter, filter);
    const materialIds: Array<string> = []
    chapters.forEach(v => {
      if (v.materialIds) {
        materialIds.push(...v.materialIds)
      }
    })
    const materials: Array<InformationType> = await Information.find({_id: {$in: Array.from(new Set(materialIds))}})
    chapters = chapters.map(v => {
      const obj = {
        ...(v as any).toObject()
      }
      if (obj.materialIds) {
        obj.materials = obj.materialIds.map((_id: string) => {
          const material = materials.find(file => file._id?.toString() === _id)
          return material
        }) as Array<InformationType>
      }
      return obj
    })
    res.json({ success: true, data: chapters });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取章节列表失败' });
  }
});

// 获取单个章节详情
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const chapter = await findOneDoc(CursorChapter, { _id: id });
    if (!chapter) {
      return res.status(404).json({ success: false, message: '章节不存在' });
    }
    res.json({ success: true, data: chapter });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取章节详情失败' });
  }
});

// 新增章节
router.post('/add', async (req: Request, res: Response): Promise<any> => {
  try {
    const data: Partial<CursorChapterType> = req.body;
    const userId = (req as any).userId;
    if (!data.courseId || !data.chapterName) {
      return res.status(400).json({ success: false, message: '课程ID和章节名称不能为空' });
    }
    const newChapter = await createDoc(CursorChapter, {
      ...data,
      createUserId: userId
    });
    res.json({ success: true, data: newChapter, message: '章节创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建章节失败' });
  }
});

// 编辑章节
router.post('/edit', async (req: Request, res: Response): Promise<any> => {
  try {
    const { _id, ...updateData } = req.body;
    if (!_id) {
      return res.status(400).json({ success: false, message: '章节ID不能为空' });
    }
    const updated = await updateDoc(CursorChapter, _id, updateData);
    res.json({ success: true, data: updated, message: '章节更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新章节失败' });
  }
});

// 删除章节
router.delete('/delete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).json({ success: false, message: '章节ID不能为空' });
    }
    await deleteDoc(CursorChapter, _id);
    res.json({ success: true, message: '章节删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除章节失败' });
  }
});

export default router;