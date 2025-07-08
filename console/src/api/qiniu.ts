import request from "./request";

export function getQiniuToken(): Promise<string> {
  return request.get('/api/qiniu/token').then(res => (res.data)
  )
}