import { UploadFile } from "antd";
import request from "./request";

export type InformationTypeType = {
  _id?: string;
  typeCode: string;
  typeName: string;
  fileType: string;
  createTime?: Date;
  createUserId?: string;
}

export interface InformationType extends Partial<UploadFile> {
  _id?: string;
  uid: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  fileExtension?: string;
  createTime?: Date;
  createUserId?: string;
}

// 资料类型
export function getInformationTypeList(params: {current: number, size: number}) {
  return request.get('/api/information/type/list', { params }).then(res => res.data);
}

export function addInformationType(data: InformationTypeType) {
  return request.post('/api/information/type/add', data);
}

export function editInformationType(data: InformationTypeType) {
  return request.post('/api/information/type/edit', data);
}

export function deleteInformationType(data: {id: string}) {
  return request.post('/api/information/type/delete', data);
}

// 资料
export function getInformationList(params: {current: number, size: number}) {
  return request.get('/api/information/list', { params }).then(res => res.data);
}

export function addInformation(data: {list: InformationType[]}) {
  return request.post('/api/information/batchAdd', data);
}

export function editInformation(data: InformationType) {
  return request.post('/api/information/edit', data);
}

export function deleteInformation(data: {id: string}) {
  return request.post('/api/information/delete', data);
}
