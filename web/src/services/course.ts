"use server";
import { CourseChapterType } from "@mooc/db-shared";
import { revalidatePath } from "next/cache";
import request from "./request";
import { redirect } from "next/navigation";

export async function getCourseDetail<T>(id: string): Promise<T> {
  return request.get(`/api/course/${id}`).then((res) => res?.data);
}

export async function getCourseChapters<T>(id: string): Promise<T> {
  return request
    .get(`/api/course/${id}/chapter`)
    .then((res) => (res?.data));
}

export async function parseChapter(data: CourseChapterType[]) {
  const roots = data.filter((v) => !v.parentChapterId);
  const keys: Array<string> = [];
  const findChildren = (
    dataList: Array<CourseChapterType>,
    roots: Array<CourseChapterType>
  ) => {
    return roots.map((v) => {
      if (v._id) {
        keys.push(v._id);
      }
      let children = dataList
        .filter((item) => item.parentChapterId === v._id)
        .sort((a, b) => (a.sort as number) - (b.sort as number));
      children = findChildren(dataList, children);
      return {
        ...v,
        title: v.chapterName,
        key: v._id,
        children: children?.length > 0 ? children : undefined,
      };
    });
  };
  const trees = findChildren(data, roots);
  return trees;
}

export async function searchCourseAction(formData: FormData) {
  const {courseName} = Object.fromEntries(formData)
  // revalidatePath(`/course/center`)
  const query = courseName ? `?courseName=${encodeURIComponent(courseName as string)}` : ''
  redirect(`/course/center${query}`)
}

export async function pageChangeAction(page: number, courseName: string) {
  revalidatePath(`/course/center`)
  const pageQuery = `page=${page || 1}`
  const query = courseName ? `?courseName=${courseName}&${pageQuery}` : `?${pageQuery}`
  redirect(`/course/center${query}`)
}

export async function fetchCourse<T>(courseName: string, page: number, pageSize: number): Promise<T> {
  const query = courseName ? {courseName} : {}
  return request.post('/api/course/center', {query, page, pageSize}).then(res => res?.data)
}