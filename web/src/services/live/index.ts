'use server'

import { UserType } from "@mooc/live-service"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import request from "../request"

export async function liveInfoAction(id: string) {
  return request.get(`/api/live/${id}`).then(res => {
    return res?.data
  })
}

export async function getAuthUserInfo(): Promise<UserType | undefined> {
  const cookie = await cookies()
  const token = cookie.get('authorization')?.value
  if(!token) {
    return undefined
  }
  return request.post('/api/auth/user/service',{token}).then(res => {
    return res.data
  })
}

export async function fetchLive<T>(title: string, page: number, pageSize: number): Promise<T> {
  const query = title ? {title} : {}
  return request.post('/api/live/center', {query, page, pageSize}).then(res => res?.data)
}

export async function searchLiveAction(formData: FormData) {
  const {title} = Object.fromEntries(formData)
  const query = title ? `?title=${encodeURIComponent(title as string)}` : ''
  redirect(`/live/center${query}`)
}

export async function pageChangeAction(page: number, title: string) {
  revalidatePath(`/live/center`)
  const pageQuery = `page=${page || 1}`
  const query = title ? `?title=${title}&${pageQuery}` : `?${pageQuery}`
  redirect(`/live/center${query}`)
}