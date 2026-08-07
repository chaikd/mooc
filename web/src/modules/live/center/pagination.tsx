'use client'
import { pageChangeAction } from "@/services/live"
import { Pagination } from "antd"

interface LiveListPaginationProps {
  title: string;
  page: number;
  pageSize: number;
  total: number;
}

export default function LiveListPagination({title, page, pageSize, total}: LiveListPaginationProps) {
  const pageChange = async (current: number) => {
    await pageChangeAction(current, title)
  }
  return(
    <div className="mt-4 inline-block">
      <Pagination defaultCurrent={page} defaultPageSize={pageSize} total={total} onChange={pageChange}/>
    </div>
  )
}