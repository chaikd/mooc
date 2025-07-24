"use server";
import request, { responseType } from "./request";

export async function getHomeInfo(): Promise<responseType> {
  return request("/api/course/home");
}
