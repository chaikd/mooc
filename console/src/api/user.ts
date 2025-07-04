import request from "./request";

type UserType = {
  username: string
  role: string
  _id: string
}

export function getSelfInfo() {
  return request.get('/api/user/selfinfo')
}

export function getUserList(params): Promise<{
  page: string | number
  size: string | number
  total: number
  data: Array<UserType>
}> {
  return request.get('/api/user/list', { params }).then(res => {
    return res.data
  });
}

export function addUser(data) {
  return request.post('/api/user/add', data);
}

export function editUser(data) {
  return request.post('/api/user/edit', data);
}

export function deleteUser(data) {
  return request.delete('/api/user/delete', { data });
}

export function getUserInfo(id) {
  return request.get('/api/user/selfinfo', { params: { _id: id } });
}
