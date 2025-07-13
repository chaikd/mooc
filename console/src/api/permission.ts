import request from "./request"

export interface PermissionType {
  _id?: string,
  parentId?: string,
  code: string,
  name: string,
  children?: Array<PermissionType>
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

export function deletePermission(id: any) {
  return request.delete('/api/permission/delete', {
    params: {id}
  })
}

export const fetchPermissionList = async () => {
  const res = await getPermissionList()
  const originData = res.data
  const data = res.data.filter((v: { parentId: any }) => !v.parentId)
  const findChildren = (datas: Array<Partial<PermissionType & {title?: string, key?: string}>>) => {
    datas.forEach((v) => {
      v.title = v.name
      v.key = v.code
      const id = v._id
      const children = res.data.filter((d: { parentId: any }) => d.parentId === id)
      if (children.length > 0) {
        v.children = children.map((val: { name: any }) => ({
          ...val,
          parentName: val.name
        }))
        findChildren(v.children as any)
      } else {
        v.children = undefined
      }
    })
  }
  findChildren(data)
  return {data, originData}
}