import request from "./request"

export interface PermissionType {
  _id?: string,
  parentId?: string,
  code: string,
  name: string,
  type: 'menu' | 'button' | 'api'
}

export function getPermissionList() {
  return request.get('/api/permission/list')
}

export function addPermission(data: PermissionType){
  return request.post('/api/permission/add', data)
}

export function editPermission(data: PermissionType) {
  return request.post('/api/permission/edit', data)
}

export function deletePermission(id) {
  return request.delete('/api/permission/delete', {
    params: {id}
  })
}