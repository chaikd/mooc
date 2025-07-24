"use server"
import CourseList from "@/modules/course/center/course-list";
import { searchCourseAction } from "@/services/course";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";

export default async function CourseCenter({
  searchParams,
}: {
  searchParams: { courseName?: string; page?: string; pageSize?: string; };
}) {
  const params = await searchParams
  const courseName = params.courseName || ''
  const page = params.page || 1
  const pageSize = params.pageSize || 9
  return(
    <div className="w-container mt-6 mx-auto min-h-[300px]">
      <div className="search">
        <form action={searchCourseAction} className="flex">
          <Input className="!w-auto" size="large" placeholder="请输入课程名称" name="courseName" defaultValue={courseName}></Input>
          <Button className="ml-4" size="large" icon={<SearchOutlined/>} htmlType="submit" type="primary"></Button>
        </form>
      </div>
      <div className="course-list mt-4">
        <CourseList {...{
          page,
          courseName,
          pageSize
        }}></CourseList>
      </div>
    </div>
  )
}