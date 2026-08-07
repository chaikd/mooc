'use client'
import { pageChangeAction } from "@/services/course"
import { Pagination } from "antd"

interface CourseListPaginationProps {
  courseName: string;
  page: number;
  pageSize: number;
  total: number;
}

export default function CourseListPagination({courseName, page, pageSize, total}: CourseListPaginationProps) {
  const pageChange = async (current: number) => {
    await pageChangeAction(current, courseName)
  }
  return(
    <div className="mt-4 inline-block">
      <Pagination defaultCurrent={page} defaultPageSize={pageSize} total={total} onChange={pageChange}/>
    </div>
  )
}