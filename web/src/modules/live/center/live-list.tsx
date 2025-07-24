import CourseCard from "@/modules/course-card"
import { LiveType } from "@mooc/db-shared"
import Link from "next/link"
import { fetchLive } from "@/services/live"
import LiveListPagination from "./pagination"

export default async function LiveList({title, page, pageSize}) {
  const res = await fetchLive<{
    liveList: LiveType[],
    total: number
  }>(title, page, pageSize)
  const liveList = res.liveList
  const total = res.total
  return (
    <>
      <div className="grid grid-cols-3 grid-flow-rows gap-4">
        {
          liveList?.map(v => {
            return(
              <Link href={`/course/${v._id}`} key={v._id}>
                <CourseCard key={v._id} isLive={v.status === 'live'} info={{
                  title: v.title,
                  instructorName: v.instructor.username,
                  studentsCount: v.totalCount,
                  cover: v.liveCover,
                }}></CourseCard>
              </Link>
            )
          })
        }
      </div>
      <div className="text-center">
        <LiveListPagination {...{title, page, pageSize, total}}></LiveListPagination>
      </div>
    </>
  )
} 