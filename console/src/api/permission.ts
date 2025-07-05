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

export const fetchPermissionList = async () => {
  let res = await getPermissionList()
  const originData = res.data
  const data = res.data.filter(v => !v.parentId)
  const findChildren = (datas) => {
    datas.forEach(v => {
      v.title = v.name
      v.key = v.code
      const id = v._id
      const children = res.data.filter(d => d.parentId === id)
      if (children.length > 0) {
        v.children = children.map(val => ({
          ...val,
          parentName: val.name
        }))
        findChildren(v.children)
      } else {
        v.children = undefined
      }
    })
  }
  findChildren(data)
  return {data, originData}
}