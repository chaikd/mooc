import request from "./request";

export type RoleType = {
  _id?: string;
  name: string,
  createTime: Date,
  editUserId?: string,
  createUserId: string
  permissions: string[]
}

export function getRoleList(params: { size: number | undefined; page?: number | undefined; }): Promise<{
  page: string | number
  size: string | number
  total: number
  data: Array<RoleType>
}> {
  return request.get('/api/role/list', { params }).then(res => {
    return res.data
  });
}

export function addRole(data: RoleType) {
  return request.post('/api/role/add', data);
}

export function editRole(data: RoleType) {
  return request.post('/api/role/edit', data);
}

export function deleteRole(data: { id: string }) {
  return request.post('/api/role/delete', data);
}

export function getRoleInfo(_id: string) {
  return request.get('/api/role/info', { params: { _id } });
}