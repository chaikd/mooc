import request, { responseType } from "./request";

export function getHomeInfo(): Promise<responseType> {
  return request('/api/course/home')
}