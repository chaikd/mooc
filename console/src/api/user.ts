import request from "./request";

export function getUserInfo() {
  return request.get('/api/user/selfinfo')
}