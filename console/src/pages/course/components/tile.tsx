import { Pagination } from "antd"
import { useState } from "react"
import CursorStatus from "@/pages/course/components/cursor-status"
import CourseActions from "@/pages/course/components/course-actions"
import { getPaginationConfig } from "@/utils/pagination-config"
import { CursorListItemType } from "@/api/course"
import dayjs from "dayjs"

export default function CursorTile({list}: {list: CursorListItemType[]}) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9 // 每页显示9个卡片（3x3网格）
  
  // 计算分页数据
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentList = list ? list.slice(startIndex, endIndex) : []
  
  return (
    <>
      <div className="grid grid-cols-3 gap-x-4 gap-y-4">
        {currentList.map(item => (
          <div key={item._id} className="cursor-item border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="cover rounded-lg overflow-hidden" style={{maxHeight:'220px'}}>
              <img 
                src={item.courseCover} 
                alt={item.courseName} 
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-[600] mt-4 text-lg">{item.courseName}</p>
            <p className="text-sm mt-2 text-gray-400">讲师：{item.instructorName}</p>
            <div className="flex justify-between text-sm mt-2 mb-3">
              <CursorStatus status={item.statusInfo}></CursorStatus>
              <span className="text-gray-400">{item.enrollment||100}名学员</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{dayjs(item.createTime).format('YYYY-MM-DD')}</span>
              <CourseActions status={item.statusInfo} course={item}/>
            </div>
          </div>
        ))}
      </div>
      
      {/* 分页器 */}
      <div className="flex justify-center mt-6">
        <Pagination
          {...getPaginationConfig(
            list ? list.length : 0,
            pageSize,
            currentPage,
            (page) => setCurrentPage(page)
          )}
        />
      </div>
    </>
  )
}