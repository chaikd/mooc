import request, { responseType } from "./request"

export const OPEN_LOGIN_EVENT = 'mooc:open-login'

export function openLoginModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_LOGIN_EVENT))
  }
}

export async function login(data: Record<string, unknown>): Promise<responseType> {
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
