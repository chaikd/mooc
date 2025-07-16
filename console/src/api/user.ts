import request from "./request";
import { RoleType } from "./role";

export type UserType = {
  username: string
  role: string
  _id?: string
  roleInfo?: RoleType
}

export function getSelfInfo() {
  return request.get('/api/user/selfinfo')
}

export function getUserList(params: { size: number; page: number; }): Promise<{
  page: number
  size: number
  total: number
  data: Array<UserType>
}> {
  return request.get('/api/user/list', { params }).then(res => {
    return res.data
  });
}

export function addUser(data: UserType) {
  return request.post('/api/user/add', data);
}

export function editUser(data: UserType) {
  return request.post('/api/user/edit', data);
}

export function deleteUser(data: { _id: string; }) {
  return request.delete('/api/user/delete', { data });
}

export function getUserInfo(id: string) {
  return request.get('/api/user/selfinfo', { params: { _id: id } });
}

export function getAllUser(params: { roleCode: string; }) {
  return request.get('/api/user/list/type', {
    params
  })
}
