import { Router, Request, Response } from 'express';
import { CourseChapter, Information } from '@/models';
import { CourseChapterType } from '@/models/course';
import { createDoc, findOneDoc, updateDoc, deleteDoc, findAll } from '@/utils/database/actions';
import { InformationType } from '@/models/information';
import { Document } from 'mongoose';
type chaptersType = CourseChapterType & Partial<{materials?: Array<InformationType>}>

const router = Router();
// 获取章节列表（可按课程ID和父章节ID筛选）
router.get('/tree/:courseId', async (req: Request, res: Response) => {
  const { courseId, parentChapterId } = req.params;
  try {
    const filter: Record<string, string> = {};
    if (courseId) filter.courseId = courseId;
    if (parentChapterId !== undefined) filter.parentChapterId = parentChapterId;
    let chapters: Array<chaptersType & Document> = await findAll(CourseChapter, filter);
    const materialIds: Array<string> = [];
    chapters.forEach(v => {
      if (v.materialIds) {
        materialIds.push(...v.materialIds)
      }
    })
    const materials: Array<InformationType> = await Information.find({_id: {$in: Array.from(new Set(materialIds))}})
    chapters = chapters.map((v) => {
      const obj = {
        ...v.toObject()
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
    res.status(500).json({ success: false, message: '获取章节列表失败', error });
  }
});

// 获取单个章节详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const chapter = await findOneDoc(CourseChapter, { _id: id });
    if (!chapter) {
      res.status(404).json({ success: false, message: '章节不存在' });
      return 
    }
    res.json({ success: true, data: chapter });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取章节详情失败', error });
  }
});

// 新增章节
router.post('/add', async (req: Request & {userId?: string}, res: Response) => {
  try {
    const data: Partial<CourseChapterType> = req.body;
    const userId = req.userId;
    if (!data.courseId || !data.chapterName) {
      res.status(400).json({ success: false, message: '课程ID和章节名称不能为空' });
      return 
    }
    const newChapter = await createDoc(CourseChapter, {
      ...data,
      createUserId: userId
    });
    res.json({ success: true, data: newChapter, message: '章节创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建章节失败', error });
  }
});

// 编辑章节
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const { _id, ...updateData } = req.body;
    if (!_id) {
      res.status(400).json({ success: false, message: '章节ID不能为空' });
      return 
    }
    const updated = await updateDoc(CourseChapter, _id, updateData);
    res.json({ success: true, data: updated, message: '章节更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新章节失败', error });
  }
});

// 删除章节
router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const { _id } = req.body;
    if (!_id) {
      res.status(400).json({ success: false, message: '章节ID不能为空' });
      return 
    }
    await deleteDoc(CourseChapter, _id);
    res.json({ success: true, message: '章节删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除章节失败', error });
  }
});

export default router;