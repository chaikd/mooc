'use client'
import { formatMillisecondsToTime, useTimeCount } from "@/utils/date";
import { LiveType, useMediaStream, UserType, useSocketIo } from "@mooc/live-service";
import { Space } from "antd";
import classNames from "classnames";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

type PropType = {
  liveDetail: (LiveType & {duration?: string}) | null
  userInfo?: UserType | undefined
  isMobile?: boolean
  // refrashPage: () => void
}

export default function LiveVideo({ liveDetail, userInfo, isMobile = false }: PropType) {
  const {id} = useParams() as {id: string}
  const streamControl = useMediaStream()
  const [timeCount] = useTimeCount(liveDetail?.liveStartTime as Date)
  const duration = dayjs(liveDetail?.liveEndTime).valueOf() - dayjs(liveDetail?.liveStartTime).valueOf()
  if(liveDetail) {
    liveDetail.duration = formatMillisecondsToTime(duration)
  }
  const tipText = useMemo(() => {
    switch(liveDetail?.status) {
			case 'ended':
				return '直播结束'
			case 'live':
				return '直播暂停'
			case 'scheduled':
				return '直播未开始'
		}
  }, [liveDetail])
  const router = useRouter()
  const getDetail = () => {
    router.refresh()
  }
  const {
    videoRef,
    audioRef,
    cameraRef,
  } = streamControl
  const {
    liveRoomInfo,
    microphoneTrack,
    hasRemoteStreamTracks,
    hasCameraStreamTracks,
  } = useSocketIo({
    id,
    userInfo,
    liveDetail,
    getDetail,
    streamControl
  })
  

  return (
    <div className="video-box relative flex w-full h-full flex-col">
      {(!hasRemoteStreamTracks && !hasCameraStreamTracks && !microphoneTrack) && <div className="absolute left-0 top-0 w-full h-full text-center pt-20 z-1">
        <span className="font-[600] text-xl">
          {tipText}
        </span>
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
          controls={isMobile}
        ></video>
        <video 
          ref={cameraRef}
          className={classNames('w-1/6 h-1/6 absolute bottom-0 right-0', {
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
          <span>时长：{liveDetail?.status === 'live' ? timeCount : liveDetail?.duration}</span>
          <span>看过：{liveRoomInfo.historyPersonCount || 0}</span>
          <span>在线：{liveRoomInfo.personCount || 0}</span>
        </Space>
      </div>
      {/* <div className="info-box1 bg-green-100">2</div>
      <div className="info-box2 bg-red-100">3</div> */}
    </div>
  )
}