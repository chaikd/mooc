import request from "./request";

export type InformationTypeType = {
  _id?: string;
  typeCode: string;
  typeName: string;
  fileType: string;
  createTime?: Date;
  createUserId?: string;
}

export type InformationType = {
  _id?: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  fileExtension?: string;
  createTime?: Date;
  createUserId?: string;
}

// 资料类型
export function getInformationTypeList(params) {
  return request.get('/api/information/type/list', { params }).then(res => res.data);
}

export function addInformationType(data) {
  return request.post('/api/information/type/add', data);
}

export function editInformationType(data) {
  return request.post('/api/information/type/edit', data);
}

export function deleteInformationType(data) {
  return request.post('/api/information/type/delete', data);
}

// 资料
export function getInformationList(params) {
  return request.get('/api/information/list', { params }).then(res => res.data);
}

export function addInformation(data) {
  return request.post('/api/information/batchAdd', data);
}

export function editInformation(data) {
  return request.post('/api/information/edit', data);
}

export function deleteInformation(data) {
  return request.post('/api/information/delete', data);
}
