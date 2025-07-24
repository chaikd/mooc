import { getHomeInfo } from "@/services/home";
import { Button } from "antd";
import Link from "next/link";
import CourseCard from "../course-card";
import dayjs from "dayjs";

export default async function HomeContent() {
  let homeInfo = {lives: [], courses: []}
  const res = await getHomeInfo();
  if (res.success) {
    homeInfo = res.data as { lives: []; courses: [] }
  }
  return (
    <div>
      <div className="live-list">
        <div className="head flex justify-between">
          <span className="text-xl font-[600]">直播推荐</span>
          <Button type="link" color="primary">
            <Link href="/course/live">查看更多</Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 grid-flow-rows gap-4 mt-2">
          {homeInfo?.lives?.map((v) => (
            <Link href={`/live/${v._id}`} key={v._id}>
              <CourseCard
                info={{
                  title: v.title,
                  instructorName: v.instructor.username,
                  studentsCount: v.totalCount,
                  cover: v.liveCover,
                }}
                isLive={
                  dayjs(v.startTime).valueOf() < dayjs().valueOf() &&
                  dayjs(v.endTime).valueOf() > dayjs().valueOf()
                }
              ></CourseCard>
            </Link>
          ))}
        </div>
      </div>
      <div className="course-list mt-8">
        <div className="head flex justify-between">
          <span className="text-xl font-[600]">课程推荐</span>
          <Button type="link" color="primary">
            <Link href="/course/center">查看更多</Link>
          </Button>
        </div>
        <div className="grid grid-cols-4 grid-flow-rows gap-4 mt-2">
          {homeInfo?.courses?.map((v) => (
            <Link href={`/course/${v._id}`} key={v._id}>
              <div>
                <CourseCard
                  info={{
                    title: v.courseName,
                    instructorName: v.instructor.username,
                    studentsCount: v.totalCount,
                    cover: v.courseCover,
                  }}
                ></CourseCard>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
