import LazyImage from "@/components/lazy-image";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button } from "antd";

export type courseInfo = {
  title: string,
  instructorName: string,
  studentsCount: number,
  cover: string
}

export default function CourseCard({ isLive = false, info }: {
  isLive?: boolean,
  info: courseInfo
}) {
  return (
    <div className="rounded-xl shadow relative overflow-hidden">
      {isLive && <div className="absolute top-0 left-0 pl-4 pt-4">
        <Button size="small" variant="solid" color="red">直播中</Button>
      </div>}
      <div className="w-full w-[420px] h-[240px]">
        <LazyImage src={info?.cover || `https://picsum.photos/500/300?random=${Math.random()}`}></LazyImage>
        {/* <Image width={500} height={300} className="w-full h-full" src={info?.cover || `https://picsum.photos/500/300?random=${Math.random()}`} priority alt="" /> */}
      </div>
      <div className="info p-2 text-xs text-gray-400">
        <p className="font-[600] text-xl text-black">
          {info?.title || '--'}
        </p>
        <p className="mt-2">
          <UserOutlined className="mr-2 text-gray-600"/>
          <span>讲师：{info?.instructorName || '--'}</span>
        </p>
        <div className="flex justify-between mt-2">
          <p>
            <TeamOutlined className="mr-2 text-gray-600"/>
            <span>{info?.studentsCount || 0}人在学习</span>
          </p>
          {/* <Button type="primary" color="primary" size="small">立即观看</Button> */}
        </div>
      </div>
    </div>
  )
}