'use client'
import { useMediaStream } from "@/services/live/live-hook";
import { useSocketIo } from "@/services/live/socketio";
import { useTimeCount } from "@/utils/date";
import { LiveType, UserType } from "@mooc/db-shared";
import { Space } from "antd";
import classNames from "classnames";
import { useParams } from "next/navigation";

type PropType = {
  liveDetail: (LiveType & {duration?: string}) | null
  userInfo?: UserType | undefined
  // refrashPage: () => void
}

export default function LiveVideo({ liveDetail, userInfo }: PropType) {
  const {id} = useParams() as {id: string}
  const streamControl = useMediaStream()
  const [timeCount] = useTimeCount(liveDetail?.liveStartTime as Date)
  const {
    videoRef,
    audioRef,
    cameraRef,
  } = streamControl
  const {
    liveRoomInfo,
    hasRemoteStreamTracks,
    hasCameraStreamTracks,
  } = useSocketIo({
    id,
    userInfo,
    liveDetail,
    streamControl
  })
  

  return (
    <div className="video-box relative flex w-full h-full flex-col">
      {liveDetail?.status === 'ended' && <div className="absolute left-0 top-0 w-full h-full text-center pt-20">
        <span className="font-[600] text-xl">直播已结束</span>
      </div>}
      <div className="relative w-full bg-gray-100 flex-1 h-0">
        <video
          ref={videoRef}
          className={classNames('w-full h-full', {
            'hidden': !hasRemoteStreamTracks
          })}
          autoPlay
          muted
          playsInline
        ></video>
        <video 
          ref={cameraRef}
          className={classNames('w-1/12 h-1/12 absolute bottom-0 right-0', {
            'hidden': !hasCameraStreamTracks
          })}
          autoPlay
          muted
          playsInline
        ></video>
        <audio 
          ref={audioRef} 
          className="hidden"
          autoPlay 
          muted
        ></audio>
      </div>
      <div className="info flex justify-between p-2 border-t border-t-gray-100">
        <span className="text-lg font-[600]">{liveDetail?.title}</span>
        <Space>
          <span>时长：{liveDetail?.status === 'ended' ? liveDetail.duration : timeCount}</span>
          <span>看过：{liveRoomInfo.historyPersonCount || 0}</span>
          <span>在线：{liveRoomInfo.personCount || 0}</span>
        </Space>
      </div>
      {/* <div className="info-box1 bg-green-100">2</div>
      <div className="info-box2 bg-red-100">3</div> */}
    </div>
  )
}