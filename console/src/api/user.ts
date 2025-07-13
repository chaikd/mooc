import request from "./request";

export type UserType = {
  username: string
  role: string
  _id: string
}

export function getSelfInfo() {
  return request.get('/api/user/selfinfo')
}

export function getUserList(params: { size: number; page: number; }): Promise<{
  page: string | number
  size: string | number
  total: number
  data: Array<UserType>
}> {
  return request.get('/api/user/list', { params }).then(res => {
    return res.data
  });
}

export function addUser(data: any) {
  return request.post('/api/user/add', data);
}

export function editUser(data: any) {
  return request.post('/api/user/edit', data);
}

export function deleteUser(data: { _id: any; }) {
  return request.delete('/api/user/delete', { data });
}

export function getUserInfo(id: any) {
  return request.get('/api/user/selfinfo', { params: { _id: id } });
}

export function getAllUser(params: { roleCode: string; }) {
  return request.get('/api/user/list/type', {
    params
  })
}
