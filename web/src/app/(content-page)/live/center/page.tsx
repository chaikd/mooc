import LiveList from "@/modules/live/center/live-list";
import { searchLiveAction } from "@/services/live";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import ListFallback from "@/components/fallback";
import { Suspense } from "react";
export const experimental_ppr = true
export default async function CourseCenter({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; page?: string; pageSize?: string; }>;
}) {
  const params = await searchParams
  const title = params.title || ''
  const page = params.page || 1
  const pageSize = params.pageSize || 9
  return(
    <div className="w-container mt-6 mx-auto min-h-[300px]">
      <div className="search">
        <form action={searchLiveAction} className="flex">
          <Input className="!w-auto" size="large" placeholder="请输入直播名称" name="title" defaultValue={title}></Input>
          <Button className="ml-4" size="large" icon={<SearchOutlined/>} htmlType="submit" type="primary"></Button>
        </form>
      </div>
      <div className="course-list mt-4">
        <Suspense fallback={<ListFallback/>}>
          <LiveList {...{
            page,
            title,
            pageSize
          }}></LiveList>
        </Suspense>
      </div>
    </div>
  )
}