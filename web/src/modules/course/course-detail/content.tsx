import { Avatar, Button, Divider } from "antd";
import Image from "next/image";
import {
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { getCourseChapters, parseChapter, useCourseDetail } from "@/services/course";
import { CourseChapterType, CourseType, UserType } from "@mooc/db-shared";
import ChapterTree from './chapter-tree'

export default async function Content({ id }) {
  const courseDetail = await useCourseDetail<
    CourseType & {
      isLive: boolean;
      studentsCount: number;
      instructor: UserType;
      description: string;
    }
  >(id);
  const courseChapter = await getCourseChapters<Array<CourseChapterType>>(id)
  const chapters = await parseChapter(courseChapter)
  return (
    <>
      <div className="grid grid-cols-3 grid-flow-rows gap-4">
        <div className="col-span-2 rounded overflow-hidden">
          {courseDetail?.courseCover && (
            <Image
              priority={true}
              width="1920"
              height="1080"
              src={courseDetail?.courseCover}
              alt={courseDetail?.courseName}
            ></Image>
          )}
          <div className="info mt-4">
            <div className="flex justify-between">
              <span className="font-[600] text-xl">
                {courseDetail?.courseName}
              </span>
              <span>
                {courseDetail?.isLive && (
                  <Button size="small" color="danger">
                    直播中
                  </Button>
                )}
              </span>
            </div>
            <div className="mt-4">
              <span className="mr-10">
                <TeamOutlined className="mr-2"></TeamOutlined>
                <span>{courseDetail?.studentsCount || 0}人在学</span>
              </span>
              <span>
                <ClockCircleOutlined className="mr-2" />
                <span>总课时：{courseDetail?.courseDuration}</span>
              </span>
            </div>
            <div className="flex mt-4">
              <div className="cover mr-2">
                <Avatar size="large" icon={<UserOutlined />}></Avatar>
              </div>
              <div>
                <span className="font-[600]">
                  {courseDetail?.instructor?.username}
                </span>
                <p className="line-h-0 mt-1">
                  {courseDetail?.instructorDesc}
                </p>
              </div>
            </div>
          </div>
          <Divider />
          <div className="mt-4">
            <p className="text-xl font-[600]">课程章节</p>
            {chapters?.map((item) => {
              return (
                <div
                  key={item._id}
                  className="mt-6 border border-gray-200 roundec p-4"
                >
                  <div>
                    <span className="font-[600] text-xl">
                      {item.chapterName}
                    </span>
                    <span className="ml-4">({item.chapterDesc})</span>
                  </div>
                  <ChapterTree data={item.children || []}></ChapterTree>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="border border-gray-200 rounded p-4">
            <p className="font-[600] text-2xl text-primary">
              ¥ {courseDetail?.price}
            </p>
            <p className="py-4">{courseDetail?.courseDesc}</p>
            {/* <Button className="w-full" type="primary" size="large">
              立即观看
            </Button> */}
          </div>
        </div>
      </div>
    </>
  );
}
