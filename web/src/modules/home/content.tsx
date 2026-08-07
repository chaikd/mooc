import { getHomeInfo } from "@/services/home";
import { Button } from "antd";
import Link from "next/link";
import CourseCard from "../course-card";
import { LiveType, CourseType } from "@mooc/db-shared";

export default async function HomeContent() {
  let homeInfo: { lives: LiveType[]; courses: CourseType[] } = {lives: [], courses: []}
  const res = await getHomeInfo();
  if (res?.success) {
    homeInfo = res.data as { lives: LiveType[]; courses: CourseType[] }
  }
  return (
    <div>
      <div className="live-list">
        <div className="head flex justify-between">
          <span className="text-xl font-[600]">直播推荐</span>
            <Link href="/live/center">
              <Button type="link" className="!text-primary">
                查看更多
              </Button>
            </Link>
        </div>
        <div className="grid grid-cols-3 grid-flow-rows gap-4 mt-2">
          {homeInfo?.lives?.map((v) => (
            <Link href={`/live/${v._id}`} key={v._id}>
              <CourseCard
                info={{
                  title: v.title,
                  instructorName: v.instructor?.username || "",
                  studentsCount: v.totalCount || 0,
                  cover: v.liveCover || "",
                }}
                isLive={
                  v.status === 'live'
                }
              ></CourseCard>
            </Link>
          ))}
        </div>
      </div>
      <div className="course-list mt-8">
        <div className="head flex justify-between">
          <span className="text-xl font-[600]">课程推荐</span>
            <Link href="/course/center">
              <Button type="link" className="!text-primary">
                查看更多
              </Button>
            </Link>
        </div>
        <div className="grid grid-cols-4 grid-flow-rows gap-4 mt-2">
          {homeInfo?.courses?.map((v) => (
            <Link href={`/course/${v._id}`} key={v._id}>
              <div>
                <CourseCard
                  info={{
                    title: v.courseName,
                    instructorName: v.instructor?.username || "",
                    studentsCount: v.totalCount || 0,
                    cover: v.courseCover || "",
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
