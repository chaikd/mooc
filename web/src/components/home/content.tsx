'use client'
import { getHomeInfo } from "@/services/home"
import { Button } from "antd"
import Link from "next/link"
import { useEffect, useState } from "react"
import CourseCard from "../course-card"
import dayjs from 'dayjs';

export default function HomeContent() {
  const [homeInfo, setHomeInfo] = useState({ lives: [], courses: [] })
  const getData = async () => {
    const res = await getHomeInfo()
    if (res.success) {
      setHomeInfo(res.data as {lives: [], courses: []})
    }
  }
  useEffect(() => {
    getData()
  }, [])
  return (
    <div>
      <div className="live-list">
        <div className="head flex justify-between">
          <span className="text-xl font-[600]">直播推荐</span>
          <Button type="link" color="primary"><Link href="/course">查看更多</Link></Button>
        </div>
        <div className="grid grid-cols-3 grid-flow-rows gap-4 mt-2">
          {
            homeInfo.lives.map(v => (
              <CourseCard key={v._id} info={
                {
                  title: v.title,
                  instructorName: v.instructor.username,
                  studentsCount: v.studentsCount,
                  cover: v.liveCover
                }
              } isLive={dayjs(v.startTime).valueOf() < dayjs().valueOf() && dayjs(v.endTime).valueOf() > dayjs().valueOf()}></CourseCard>
            ))
          }
        </div>
      </div>
      <div className="course-list mt-8">
        <div className="head flex justify-between">
          <span className="text-xl font-[600]">课程推荐</span>
          <Button type="link" color="primary"><Link href="/course">查看更多</Link></Button>
        </div>
        <div className="grid grid-cols-4 grid-flow-rows gap-4 mt-2">
          {
            homeInfo.courses.map(v => (
              <CourseCard info={{
                title: v.courseName,
                instructorName: v.instructor.username,
                studentsCount: v.studentsCount,
                cover: v.courseCover
              }} key={v._id}></CourseCard>
            ))
          }
        </div>
      </div>
    </div>
  )
}