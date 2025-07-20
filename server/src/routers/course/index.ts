import { Router, Request, Response } from 'express';
import { Course, CourseStatus, User, CourseType, mdaction } from '@mooc/db-shared';
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
    const queryFilter = { ...filter };
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
    const courses = await mdaction.findDocs(Course, queryFilter, limit, skip);
    const total = await mdaction.countDocs(Course, queryFilter);

    // 获取所有涉及的用户ID和状态ID
    const userIds = Array.from(new Set(courses.map(c => c.instructorId).filter(Boolean)));
    const statusIds = Array.from(new Set(courses.map(c => c.statusId).filter(Boolean)));

    // 查询讲师信息
    let instructorMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const instructors = await User.find({ _id: { $in: userIds } }, 'username');
      instructorMap = instructors.reduce<Record<string, string>>((acc, cur) => {
        acc[String(cur._id)] = cur.username;
        return acc;
      }, {});
    }

    // 查询状态信息
    let statusMap: Record<string, object> = {};
    if (statusIds.length > 0) {
      const statuses = await CourseStatus.find({ _id: { $in: statusIds } }, 'statusName statusCode');
      statusMap = statuses.reduce<Record<string, object>>((acc, cur) => {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: '课程ID不能为空'
      });
      return 
    }

    const course = await mdaction.findOneDoc(Course, { _id: id });
    
    if (!course) {
      res.status(404).json({
        success: false,
        message: '课程不存在'
      });
      return 
    }

    // 查询讲师信息
    const instructor = await mdaction.findOneDoc(User, { _id: course.instructorId }, 'username');
    
    // 查询状态信息
    const status = await mdaction.findOneDoc(CourseStatus, { _id: course.statusId }, 'statusName statusCode statusDesc');

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
      message: '查询课程详情失败',
      error
    });
  }
});

// 新增课程
router.post('/add', async (req: Request & {userId?: string}, res: Response) => {
  try {
    const courseData: Partial<CourseType> = req.body;
    const userId = req.userId;

    // 验证必填字段
    if (!courseData.courseName) {
      res.status(400).json({
        success: false,
        message: '课程名称不能为空'
      });
      return 
    }

    if (!courseData.instructorId) {
      res.status(400).json({
        success: false,
        message: '讲师ID不能为空'
      });
      return 
    }

    if (!courseData.statusCode) {
      res.status(400).json({
        success: false,
        message: '课程状态不能为空'
      });
      return 
    }

    // 验证讲师是否存在
    const instructor = await mdaction.findOneDoc(User, { _id: courseData.instructorId });
    if (!instructor) {
      res.status(400).json({
        success: false,
        message: '讲师不存在'
      });
      return 
    }

    // 验证状态是否存在
    const status = await mdaction.findOneDoc(CourseStatus, { statusCode: courseData.statusCode });
    if (!status) {
      res.status(400).json({
        success: false,
        message: '课程状态不存在'
      });
      return 
    } else {
      courseData.statusId = status._id
    }

    // 创建课程
    const newCourse = await mdaction.createDoc(Course, {
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
      message: '创建课程失败',
      error
    });
  }
});

// 更新课程
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const { _id, ...updateData }: Partial<CourseType> & { _id: string } = req.body;

    if (!_id) {
      res.status(400).json({
        success: false,
        message: '课程ID不能为空'
      });
      return 
    }

    // 检查课程是否存在
    const existingCourse = await mdaction.findOneDoc(Course, { _id });
    if (!existingCourse) {
      res.status(404).json({
        success: false,
        message: '课程不存在'
      });
      return 
    }

    // 如果更新讲师ID，验证讲师是否存在
    if (updateData.instructorId) {
      const instructor = await mdaction.findOneDoc(User, { _id: updateData.instructorId });
      if (!instructor) {
        res.status(400).json({
          success: false,
          message: '讲师不存在'
        });
        return 
      }
    }

    // 如果更新状态ID，验证状态是否存在
    if (updateData.statusCode) {
      const status = await mdaction.findOneDoc(CourseStatus, { statusCode: updateData.statusCode });
      if (!status) {
        res.status(400).json({
          success: false,
          message: '课程状态不存在'
        });
        return 
      } else {
        updateData.statusId = status._id
      }
    }

    // 更新课程
    const updatedCourse = await mdaction.updateDoc(Course, _id, updateData);

    res.json({
      success: true,
      data: updatedCourse,
      message: '课程更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新课程失败',
      error
    });
  }
});

// 删除课程
router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      res.status(400).json({
        success: false,
        message: '课程ID不能为空'
      });
      return 
    }

    // 检查课程是否存在
    const existingCourse = await mdaction.findOneDoc(Course, { _id });
    if (!existingCourse) {
      res.status(404).json({
        success: false,
        message: '课程不存在'
      });
      return 
    }

    // 删除课程
    await mdaction.deleteDoc(Course, _id);

    res.json({
      success: true,
      message: '课程删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除课程失败',
      error
    });
  }
});

// 获取课程状态列表
router.get('/status/list', async (req: Request, res: Response) => {
  try {
    const statuses = await mdaction.findDocs(CourseStatus, {}, 100, 0);
    
    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询课程状态列表失败',
      error
    });
  }
});

export default router; 