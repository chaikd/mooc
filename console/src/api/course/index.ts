import request from "../request";

// 课程数据类型
export interface CourseType {
  _id?: string;
  courseName: string;      // 课程名称
  instructorId: string;    // 讲师id
  instructorDesc: string;    // 讲师描述
  courseDesc?: string;     // 课程描述
  courseCover?: string;    // 课程封面
  courseDuration?: number; // 课程时长（分钟）
  price?: number;          // 价格
  sort?: number;           // 排序
  statusId: string;        // 课程状态id
  statusCode: number;
  createTime?: Date;       // 创建时间
  createUserId?: string;   // 创建用户id
}

// 课程列表项类型（包含关联信息）
export interface CourseListItemType extends CourseType {
  instructorName?: string;  // 讲师姓名
  statusInfo: {
    statusName: string;
    statusCode: string;
  };
  enrollment?: string;
}

// 课程详情类型
export interface CourseDetailType extends CourseType {
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
export interface CourseListParams {
  page?: number;
  size?: number;
  courseName?: string;
  statusId?: string;
  instructorId?: string;
}

// 课程创建参数
export interface CourseCreateParams {
  courseName?: string;
  instructorId?: string;
  instructorDesc?: string;
  courseDesc?: string;
  courseCover?: string;
  courseDuration?: number;
  price?: number;
  sort?: number;
  statusId?: string;
  statusCode?: string | number;
}

// 课程更新参数
export interface CourseUpdateParams extends CourseCreateParams {
  _id: string;
}

// 课程列表响应
export interface CourseListResponse {
  data: CourseListItemType[];
  total: number;
  page: number;
  size: number;
}

// 获取课程列表
export function getCourseList(params: CourseListParams = {}): Promise<{
  success: boolean;
  data: CourseListResponse;
}> {
  return request.get('/api/course/list', { params });
}

// 获取课程详情
export function getCourseDetail(id: string): Promise<{
  success: boolean;
  data: CourseDetailType;
}> {
  return request.get(`/api/course/${id}`);
}

// 创建课程
export function createCourse(data: CourseCreateParams): Promise<{
  success: boolean;
  data: CourseType;
  message: string;
}> {
  return request.post('/api/course/add', data);
}

// 更新课程
export function updateCourse(data: CourseUpdateParams): Promise<{
  success: boolean;
  data: CourseType;
  message: string;
}> {
  return request.post('/api/course/edit', data);
}

// 删除课程
export function deleteCourse(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return request.delete('/api/course/delete', { data: { _id: id } });
}
