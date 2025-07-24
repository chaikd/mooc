'use client'
import { pageChangeAction } from "@/services/course"
import { Pagination } from "antd"
import { startTransition } from "react"

export default function CourseListPagination({courseName, page, pageSize, total}) {
  const pageChange = async (current) => {
    await pageChangeAction(current, courseName)
  }
  return(
    <div className="mt-4 inline-block">
      <Pagination defaultCurrent={page} defaultPageSize={pageSize} total={total} onChange={pageChange}/>
    </div>
  )
}