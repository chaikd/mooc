'use server'

import { UserType } from "@mooc/db-shared"
import request from "../request"
import { cookies } from "next/headers"

export async function liveInfoAction(id) {
  return request(`/api/live/${id}`).then(res => {
    return res?.data
  })
}

export async function getAuthUserInfo(): Promise<UserType | undefined> {
  const cookie = await cookies()
  const token = cookie.get('authorization')?.value
  if(!token) {
    return undefined
    // return {
    //   success: false,
    //   message: '当前用户未登陆',
    //   data: undefined
    // }
  }
  return request.post('/api/auth/user/service',{token}).then(res => {
    return res.data
  })
}