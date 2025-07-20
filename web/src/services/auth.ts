import request, { responseType } from "./request"

// const host = process.env.NEXT_PUBLIC_API_HOST
// export async function loginService(state, formData) {
//   const res = await request.post('/api/auth/login', formData) as responseType
//   return res
// }
export async function login(data): Promise<responseType> {
  return request.post('/api/auth/login', data)
}

export async function getUserInfo() {
  return request.get('/api/auth/user')
}

export async function logOut(): Promise<responseType> {
  return request.get('/api/auth/logout')
}