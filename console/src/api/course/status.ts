import request from "../request";

// 课程状态类型
export interface CourseStatusType {
  _id?: string;
  statusCode: string;
  statusName: string;
  statusDesc?: string;
  sort?: number;
  createTime: Date;
  createUserId: string;
}

// 课程状态列表查询参数
export interface CourseStatusListParams {
  size?: number;
  page?: number;
  statusName?: string;
  statusCode?: string;
}

// 课程状态列表响应
export interface CourseStatusListResponse {
  data: CourseStatusType[];
  total: number;
  page: number;
  size: number;
}

// 课程状态创建参数
export interface CourseStatusCreateParams {
  statusCode: string;
  statusName: string;
  statusDesc?: string;
  sort?: number;
}

// 课程状态更新参数
export interface CourseStatusUpdateParams extends CourseStatusCreateParams {
  _id: string;
}

// 获取课程状态列表
export function getCourseStatusList(params: CourseStatusListParams = {}): Promise<{
  success: boolean;
  data: CourseStatusListResponse;
}> {
  return request.get('/api/course/status/list', { params });
}

// 获取课程状态详情
export function getCourseStatusDetail(id: string): Promise<{
  success: boolean;
  data: CourseStatusType;
}> {
  return request.get(`/api/course/status/detail/${id}`);
}

// 创建课程状态
export function createCourseStatus(data: CourseStatusCreateParams): Promise<{
  success: boolean;
  data: CourseStatusType;
  message: string;
}> {
  return request.post('/api/course/status/add', data);
}

// 更新课程状态
export function updateCourseStatus(data: CourseStatusUpdateParams): Promise<{
  success: boolean;
  data: CourseStatusType;
  message: string;
}> {
  return request.post('/api/course/status/edit', data);
}

// 删除课程状态
export function deleteCourseStatus(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return request.delete('/api/course/status/delete', { data: { _id: id } });
}

// 获取所有课程状态（用于下拉选择）
export function getAllCourseStatus(): Promise<{
  success: boolean;
  data: CourseStatusType[];
}> {
  return request.get('/api/course/status/all');
} 