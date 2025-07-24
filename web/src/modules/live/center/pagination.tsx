'use client'
import { pageChangeAction } from "@/services/live"
import { Pagination } from "antd"

export default function LiveListPagination({title, page, pageSize, total}) {
  const pageChange = async (current) => {
    await pageChangeAction(current, title)
  }
  return(
    <div className="mt-4 inline-block">
      <Pagination defaultCurrent={page} defaultPageSize={pageSize} total={total} onChange={pageChange}/>
    </div>
  )
}