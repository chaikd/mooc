import request from "../request";

// 课程数据类型
export interface CursorType {
  _id?: string;
  courseName: string;      // 课程名称
  instructorId: string;    // 讲师id
  courseDesc?: string;     // 课程描述
  courseCover?: string;    // 课程封面
  courseDuration?: number; // 课程时长（分钟）
  price?: number;          // 价格
  sort?: number;           // 排序
  statusId: string;        // 课程状态id
  createTime?: Date;       // 创建时间
  createUserId?: string;   // 创建用户id
}

// 课程列表项类型（包含关联信息）
export interface CursorListItemType extends CursorType {
  instructorName?: string;  // 讲师姓名
  statusInfo: {
    statusName: string;
    statusCode: string;
  };
  enrollment?: string;
}

// 课程详情类型
export interface CursorDetailType extends CursorType {
  instructorInfo?: {
    _id: string;
    username: string;
  };
  statusInfo?: {
    _id: string;
    statusName: string;
    statusCode: string;
    statusDesc?: string;
  };
}

// 课程列表查询参数
export interface CursorListParams {
  page?: number;
  size?: number;
  courseName?: string;
  statusId?: string;
  instructorId?: string;
}

// 课程创建参数
export interface CursorCreateParams {
  courseName?: string;
  instructorId?: string;
  courseDesc?: string;
  courseCover?: string;
  courseDuration?: number;
  price?: number;
  sort?: number;
  statusId?: string;
  statusCode?: string | number;
}

// 课程更新参数
export interface CursorUpdateParams extends CursorCreateParams {
  _id: string;
}

// 课程列表响应
export interface CursorListResponse {
  data: CursorListItemType[];
  total: number;
  page: number;
  size: number;
}

// 获取课程列表
export function getCursorList(params: CursorListParams = {}): Promise<{
  success: boolean;
  data: CursorListResponse;
}> {
  return request.get('/api/course/list', { params });
}

// 获取课程详情
export function getCursorDetail(id: string): Promise<{
  success: boolean;
  data: CursorDetailType;
}> {
  return request.get(`/api/course/${id}`);
}

// 创建课程
export function createCursor(data: CursorCreateParams): Promise<{
  success: boolean;
  data: CursorType;
  message: string;
}> {
  return request.post('/api/course/add', data);
}

// 更新课程
export function updateCursor(data: CursorUpdateParams): Promise<{
  success: boolean;
  data: CursorType;
  message: string;
}> {
  return request.post('/api/course/edit', data);
}

// 删除课程
export function deleteCursor(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return request.delete('/api/course/delete', { data: { _id: id } });
}
