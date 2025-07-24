import LiveChat from "@/modules/live/chat";
import LiveVideo from "@/modules/live/live";
import { getAuthUserInfo, liveInfoAction } from "@/services/live";
import { ClockCircleOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button } from "antd";
import dayjs from "dayjs";

export default async function LiveDetail({ params }) {
  const { id } = await params;
  const userInfo = await getAuthUserInfo()
  const liveInfo = await liveInfoAction(id)
  return (
    <div className="live w-container mx-auto mt-6">
      <div className="head">
        <span className="text-2xl font-[600]">{liveInfo.title}</span>
        <div className="mt-4">
          <Avatar icon={<UserOutlined />}></Avatar>
          <span className="ml-2">{liveInfo?.instructor?.username || '--'}</span>
          <Button className="ml-2" size="small" type="primary">主讲人</Button>
          <ClockCircleOutlined className="mr-2 ml-4" />
          <span>直播时间：{dayjs(liveInfo?.startTime).format('YYYY-MM-DD HH:mm')} - {dayjs(liveInfo?.endTime).format('YYYY-MM-DD HH:mm')}</span>
        </div>
      </div>
      <div className="grid xl:grid-cols-3 xl:grid-flow-rows gap-4 mt-4 sm:grid-cols-1 sm:grid-rows-2">
        <div className="col-span-2 overflow-hidden max-h-[500px]">
          <LiveVideo {...{
            liveDetail: liveInfo,
            userInfo
          }}></LiveVideo>
        </div>
        <div className="max-h-[500px] border border-gray-100">
          <LiveChat {...{
            liveDetail: liveInfo,
            userInfo
          }}></LiveChat>
        </div>
      </div>
    </div>
  )
}