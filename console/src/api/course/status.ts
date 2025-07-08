import request from "../request";

// 课程状态类型
export interface CursorStatusType {
  _id?: string;
  statusCode: string;
  statusName: string;
  statusDesc?: string;
  sort?: number;
  createTime: Date;
  createUserId: string;
}

// 课程状态列表查询参数
export interface CursorStatusListParams {
  size?: number;
  page?: number;
  statusName?: string;
  statusCode?: string;
}

// 课程状态列表响应
export interface CursorStatusListResponse {
  data: CursorStatusType[];
  total: number;
  page: number;
  size: number;
}

// 课程状态创建参数
export interface CursorStatusCreateParams {
  statusCode: string;
  statusName: string;
  statusDesc?: string;
  sort?: number;
}

// 课程状态更新参数
export interface CursorStatusUpdateParams extends CursorStatusCreateParams {
  _id: string;
}

// 获取课程状态列表
export function getCursorStatusList(params: CursorStatusListParams = {}): Promise<{
  success: boolean;
  data: CursorStatusListResponse;
}> {
  return request.get('/api/course/status/list', { params });
}

// 获取课程状态详情
export function getCursorStatusDetail(id: string): Promise<{
  success: boolean;
  data: CursorStatusType;
}> {
  return request.get(`/api/course/status/detail/${id}`);
}

// 创建课程状态
export function createCursorStatus(data: CursorStatusCreateParams): Promise<{
  success: boolean;
  data: CursorStatusType;
  message: string;
}> {
  return request.post('/api/course/status/add', data);
}

// 更新课程状态
export function updateCursorStatus(data: CursorStatusUpdateParams): Promise<{
  success: boolean;
  data: CursorStatusType;
  message: string;
}> {
  return request.post('/api/course/status/edit', data);
}

// 删除课程状态
export function deleteCursorStatus(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return request.delete('/api/course/status/delete', { data: { _id: id } });
}

// 获取所有课程状态（用于下拉选择）
export function getAllCursorStatus(): Promise<{
  success: boolean;
  data: CursorStatusType[];
}> {
  return request.get('/api/course/status/all');
} 