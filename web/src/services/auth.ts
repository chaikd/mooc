import request, { responseType } from "./request"

export async function login(data): Promise<responseType> {
  return request.post('/api/auth/login', data)
}

export async function getUserInfo() {
  return request.get('/api/auth/user').then((res) => (res?.data)).catch(err => {
    console.log("🚀 ~ returnrequest.get ~ err:", err)
  })
}

export async function logOut(): Promise<responseType> {
  return request.get('/api/auth/logout')
}