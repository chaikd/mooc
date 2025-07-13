import request from "./request";

interface responseType {
  message?: string;
  success?: boolean
}

export async function registServerAction(params: {password:string, username: string}): Promise<responseType> {
  return request.post('/api/auth/regist', params)
}

export async function loginServerAction(params: {password:string, username: string}): Promise<responseType & {token: string, userId: string}> {
  return request.post('/api/auth/login', params)
}

export async function logoutServerAction(): Promise<responseType> {
  return request.get('/api/auth/logout')
}