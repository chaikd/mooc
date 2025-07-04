import request from "./request";

export type RoleType = {
  _id?: string;
  name: String,
  createTime: Date,
  createUserId: String
}

export function getRoleList(params): Promise<{
  page: string | number
  size: string | number
  total: number
  data: Array<RoleType>
}> {
  return request.get('/api/role/list', { params }).then(res => {
    return res.data
  });
}

export function addRole(data) {
  return request.post('/api/role/add', data);
}

export function editRole(data) {
  return request.post('/api/role/edit', data);
}

export function deleteRole(data) {
  return request.post('/api/role/delete', data);
}

export function getRoleInfo(_id) {
  return request.get('/api/role/info', { params: { _id } });
}