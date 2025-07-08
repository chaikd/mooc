import { Router, Request, Response } from 'express';
import { CursorStatus } from '@/models';
import { CursorStatusType } from '@/models/course';
import { createDoc, findOneDoc, findDocs, updateDoc, deleteDoc, countDocs } from '@/utils/database/actions';

const router = Router();

// 获取课程状态列表
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { size = 100, page = 1, statusName, statusCode, ...filter } = req.query;
    const limit = Number(size);
    const skip = (Number(page) - 1) * limit;
    
    // 构建查询条件
    const queryFilter: any = { ...filter };
    if (statusName) {
      queryFilter.statusName = { $regex: statusName, $options: 'i' };
    }
    if (statusCode) {
      queryFilter.statusCode = { $regex: statusCode, $options: 'i' };
    }

    // 查询状态列表
    const statuses = await findDocs(CursorStatus, queryFilter, limit, skip);
    const total = await countDocs(CursorStatus, queryFilter);

    res.json({
      success: true,
      data: {
        data: statuses,
        total,
        page: Number(page),
        size: limit
      }
    });
  } catch (error) {
    console.error('查询课程状态列表失败:', error);
    res.status(500).json({
      success: false,
      message: '查询课程状态列表失败'
    });
  }
});

// 获取单个课程状态详情
router.get('/detail/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '状态ID不能为空'
      });
    }

    const status = await findOneDoc(CursorStatus, { _id: id });
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: '课程状态不存在'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('查询课程状态详情失败:', error);
    res.status(500).json({
      success: false,
      message: '查询课程状态详情失败'
    });
  }
});

// 新增课程状态
router.post('/add', async (req: Request, res: Response): Promise<any> => {
  try {
    const statusData: Partial<CursorStatusType> = req.body;
    const userId = (req as any).userId;

    // 验证必填字段
    if (!statusData.statusCode) {
      return res.status(400).json({
        success: false,
        message: '状态代码不能为空'
      });
    }

    if (!statusData.statusName) {
      return res.status(400).json({
        success: false,
        message: '状态名称不能为空'
      });
    }

    // 检查状态代码是否已存在
    const existingStatus = await findOneDoc(CursorStatus, { statusCode: statusData.statusCode });
    if (existingStatus) {
      return res.status(400).json({
        success: false,
        message: '状态代码已存在'
      });
    }

    // 创建课程状态
    const newStatus = await createDoc(CursorStatus, {
      ...statusData,
      createUserId: userId
    });

    res.json({
      success: true,
      data: newStatus,
      message: '课程状态创建成功'
    });
  } catch (error) {
    console.error('创建课程状态失败:', error);
    res.status(500).json({
      success: false,
      message: '创建课程状态失败'
    });
  }
});

// 更新课程状态
router.post('/edit', async (req: Request, res: Response): Promise<any> => {
  try {
    const { _id, ...updateData }: Partial<CursorStatusType> & { _id: string } = req.body;
    const userId = (req as any).userId;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: '状态ID不能为空'
      });
    }

    // 检查状态是否存在
    const existingStatus = await findOneDoc(CursorStatus, { _id });
    if (!existingStatus) {
      return res.status(404).json({
        success: false,
        message: '课程状态不存在'
      });
    }

    // 如果更新状态代码，检查是否与其他状态冲突
    if (updateData.statusCode && updateData.statusCode !== existingStatus.statusCode) {
      const conflictStatus = await CursorStatus.findOne({ 
        statusCode: updateData.statusCode,
        _id: { $ne: _id }
      });
      if (conflictStatus) {
        return res.status(400).json({
          success: false,
          message: '状态代码已存在'
        });
      }
    }

    // 更新课程状态
    const updatedStatus = await updateDoc(CursorStatus, _id, updateData);

    res.json({
      success: true,
      data: updatedStatus,
      message: '课程状态更新成功'
    });
  } catch (error) {
    console.error('更新课程状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新课程状态失败'
    });
  }
});

// 删除课程状态
router.delete('/delete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: '状态ID不能为空'
      });
    }

    // 检查状态是否存在
    const existingStatus = await findOneDoc(CursorStatus, { _id });
    if (!existingStatus) {
      return res.status(404).json({
        success: false,
        message: '课程状态不存在'
      });
    }

    // TODO: 检查是否有课程正在使用此状态
    // const coursesUsingStatus = await findDocs(Cursor, { statusId: _id }, 1, 0);
    // if (coursesUsingStatus.length > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: '该状态正在被课程使用，无法删除'
    //   });
    // }

    // 删除课程状态
    await deleteDoc(CursorStatus, _id);

    res.json({
      success: true,
      message: '课程状态删除成功'
    });
  } catch (error) {
    console.error('删除课程状态失败:', error);
    res.status(500).json({
      success: false,
      message: '删除课程状态失败'
    });
  }
});

// 获取所有课程状态（用于下拉选择）
router.get('/all', async (req: Request, res: Response) => {
  try {
    const statuses = await findDocs(CursorStatus, {}, 1000, 0, 'statusCode statusName sort');
    
    // 按排序字段排序
    const sortedStatuses = statuses.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    res.json({
      success: true,
      data: sortedStatuses
    });
  } catch (error) {
    console.error('查询所有课程状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询所有课程状态失败'
    });
  }
});

export default router;
