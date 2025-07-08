import { Router, Request, Response } from 'express';
import { Cursor, CursorStatus, User } from '@/models';
import { CursorType } from '@/models/course';
import { createDoc, findOneDoc, findDocs, updateDoc, deleteDoc, countDocs } from '@/utils/database/actions';
import statusRouter from './status';
import chapterRouter from './chapter'

const router = Router();

// 注册课程状态管理路由
router.use('/status', statusRouter);
// 注册课程章节管理
router.use('/chapter', chapterRouter)

// 课程列表查询接口
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { size = 10, page = 1, courseName, statusId, instructorId, ...filter } = req.query;
    const limit = Number(size);
    const skip = (Number(page) - 1) * limit;
    
    // 构建查询条件
    const queryFilter: any = { ...filter };
    if (courseName) {
      queryFilter.courseName = { $regex: courseName, $options: 'i' };
    }
    if (statusId) {
      queryFilter.statusId = statusId;
    }
    if (instructorId) {
      queryFilter.instructorId = instructorId;
    }

    // 查询课程列表
    const courses = await findDocs(Cursor, queryFilter, limit, skip);
    const total = await countDocs(Cursor, queryFilter);

    // 获取所有涉及的用户ID和状态ID
    const userIds = Array.from(new Set(courses.map(c => c.instructorId).filter(Boolean)));
    const statusIds = Array.from(new Set(courses.map(c => c.statusId).filter(Boolean)));

    // 查询讲师信息
    let instructorMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const instructors = await User.find({ _id: { $in: userIds } }, 'username');
      instructorMap = instructors.reduce<Record<string, any>>((acc, cur) => {
        acc[String(cur._id)] = cur.username;
        return acc;
      }, {});
    }

    // 查询状态信息
    let statusMap: Record<string, any> = {};
    if (statusIds.length > 0) {
      const statuses = await CursorStatus.find({ _id: { $in: statusIds } }, 'statusName statusCode');
      statusMap = statuses.reduce<Record<string, any>>((acc, cur) => {
        acc[String(cur._id)] = { statusName: cur.statusName, statusCode: cur.statusCode };
        return acc;
      }, {});
    }

    // 组装返回数据
    const coursesWithInfo = courses.map(course => ({
      ...course.toObject(),
      instructorName: instructorMap[String(course.instructorId)] || '',
      statusInfo: statusMap[String(course.statusId)] || {}
    }));

    res.json({
      success: true,
      data: {
        data: coursesWithInfo,
        total,
        page: Number(page),
        size: limit
      }
    });
  } catch (error) {
    console.error('查询课程列表失败:', error);
    res.status(500).json({
      success: false,
      message: '查询课程列表失败'
    });
  }
});

// 获取单个课程详情
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '课程ID不能为空'
      });
    }

    const course = await findOneDoc(Cursor, { _id: id });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    // 查询讲师信息
    const instructor = await findOneDoc(User, { _id: course.instructorId }, 'username');
    
    // 查询状态信息
    const status = await findOneDoc(CursorStatus, { _id: course.statusId }, 'statusName statusCode statusDesc');

    const courseDetail = {
      ...course.toObject(),
      instructorInfo: instructor ? { _id: instructor._id, username: instructor.username } : null,
      statusInfo: status ? { 
        _id: status._id, 
        statusName: status.statusName, 
        statusCode: status.statusCode,
        statusDesc: status.statusDesc 
      } : null
    };

    res.json({
      success: true,
      data: courseDetail
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询课程详情失败'
    });
  }
});

// 新增课程
router.post('/add', async (req: Request, res: Response): Promise<any> => {
  try {
    const courseData: Partial<CursorType> = req.body;
    const userId = (req as any).userId;

    // 验证必填字段
    if (!courseData.courseName) {
      return res.status(400).json({
        success: false,
        message: '课程名称不能为空'
      });
    }

    if (!courseData.instructorId) {
      return res.status(400).json({
        success: false,
        message: '讲师ID不能为空'
      });
    }

    if (!courseData.statusCode) {
      return res.status(400).json({
        success: false,
        message: '课程状态不能为空'
      });
    }

    // 验证讲师是否存在
    const instructor = await findOneDoc(User, { _id: courseData.instructorId });
    if (!instructor) {
      return res.status(400).json({
        success: false,
        message: '讲师不存在'
      });
    }

    // 验证状态是否存在
    const status = await findOneDoc(CursorStatus, { statusCode: courseData.statusCode });
    if (!status) {
      return res.status(400).json({
        success: false,
        message: '课程状态不存在'
      });
    } else {
      courseData.statusId = status._id
    }

    // 创建课程
    const newCourse = await createDoc(Cursor, {
      ...courseData,
      createUserId: userId
    });

    res.json({
      success: true,
      data: newCourse,
      message: '课程创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建课程失败'
    });
  }
});

// 更新课程
router.post('/edit', async (req: Request, res: Response): Promise<any> => {
  try {
    const { _id, ...updateData }: Partial<CursorType> & { _id: string } = req.body;
    const userId = (req as any).userId;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: '课程ID不能为空'
      });
    }

    // 检查课程是否存在
    const existingCourse = await findOneDoc(Cursor, { _id });
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    // 如果更新讲师ID，验证讲师是否存在
    if (updateData.instructorId) {
      const instructor = await findOneDoc(User, { _id: updateData.instructorId });
      if (!instructor) {
        return res.status(400).json({
          success: false,
          message: '讲师不存在'
        });
      }
    }

    // 如果更新状态ID，验证状态是否存在
    if (updateData.statusCode) {
      const status = await findOneDoc(CursorStatus, { statusCode: updateData.statusCode });
      if (!status) {
        return res.status(400).json({
          success: false,
          message: '课程状态不存在'
        });
      } else {
        updateData.statusId = status._id
      }
    }

    // 更新课程
    const updatedCourse = await updateDoc(Cursor, _id, updateData);

    res.json({
      success: true,
      data: updatedCourse,
      message: '课程更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新课程失败'
    });
  }
});

// 删除课程
router.delete('/delete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: '课程ID不能为空'
      });
    }

    // 检查课程是否存在
    const existingCourse = await findOneDoc(Cursor, { _id });
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }

    // 删除课程
    await deleteDoc(Cursor, _id);

    res.json({
      success: true,
      message: '课程删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除课程失败'
    });
  }
});

// 获取课程状态列表
router.get('/status/list', async (req: Request, res: Response) => {
  try {
    const statuses = await findDocs(CursorStatus, {}, 100, 0);
    
    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询课程状态列表失败'
    });
  }
});

export default router; 