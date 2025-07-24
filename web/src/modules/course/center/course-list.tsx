import CourseCard from "@/modules/course-card"
import { fetchCourse } from "@/services/course"
import { CourseType } from "@mooc/db-shared"
import CourseListPagination from "./pagination"
import Link from "next/link"

export default async function CourseList({courseName, page, pageSize}) {
  const res = await fetchCourse<{
    courseList: CourseType[],
    total: number
  }>(courseName, page, pageSize)
  const courseList = res.courseList
  const total = res.total
  return (
    <>
      <div className="grid grid-cols-3 grid-flow-rows gap-4">
        {
          courseList?.map(v => {
            return(
              <Link href={`/course/${v._id}`} key={v._id}>
                <CourseCard key={v._id} info={{
                  title: v.courseName,
                  instructorName: v.instructor.username,
                  studentsCount: v.totalCount,
                  cover: v.courseCover,
                }}></CourseCard>
              </Link>
            )
          })
        }
      </div>
      <div className="text-center">
        <CourseListPagination {...{courseName, page, pageSize, total}}></CourseListPagination>
      </div>
    </>
  )
} 