import { Pagination } from "antd"
import { useCallback } from "react"
import CourseStatus from "@/pages/course/components/cursor-status"
import CourseActions from "@/pages/course/components/course-actions"
import dayjs from "dayjs"
import LazyImage from "@/components/lazy-image"
import { ListDataType } from "../list"

export default function CourseTile({list, fetchList}: {list: ListDataType, fetchList: (pagination?: {current: number, pageSize: number}) => void}) {
  const fetchFn = useCallback(fetchList, [])
  const paginationChange = (page: number, pageSize: number) => {
    fetchFn({
      current: page,
      pageSize
    })
  }
  const fetchData = () => {
    fetchFn({
      current: list.page,
      pageSize: list.size
    })
  }
  return (
    <>
      <div className="grid grid-cols-3 gap-x-4 gap-y-4">
        {list.data.map(item => (
          <div key={item._id} className="cursor-item border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="cover rounded-lg overflow-hidden" style={{maxHeight:'220px'}}>
              <LazyImage {
                ...{
                  src: item.courseCover as string
                }
              }></LazyImage>
            </div>
            <p className="font-[600] mt-4 text-lg">{item.courseName}</p>
            <p className="text-sm mt-2 text-gray-400">讲师：{item.instructorName}</p>
            <div className="flex justify-between text-sm mt-2 mb-3">
              <CourseStatus status={item.statusInfo}></CourseStatus>
              <span className="text-gray-400">{item.enrollment||100}名学员</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{dayjs(item.createTime).format('YYYY-MM-DD')}</span>
              <CourseActions status={item.statusInfo} course={item} fetchList={fetchData}/>
            </div>
          </div>
        ))}
      </div>
      
      {/* 分页器 */}
      <div className="flex justify-center mt-6">
        <Pagination
          {...{
            current: list.page,
            pageSize: list.size,
            total: list.total,
            onChange: paginationChange
          }}
        />
      </div>
    </>
  )
}