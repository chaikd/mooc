import { LiveType } from "@/api/live";
import { Space } from "antd";
import { Ref, useMemo } from "react";
import { useSocketIo } from "../services/socketio";
import { UserType } from "@/api/user";
import { useTimeCount } from "@/utils/date";
import { useParams } from "react-router";
import { AudioMutedOutlined, AudioOutlined, CameraOutlined, PauseOutlined, VideoCameraAddOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMediaStream } from "../services/live-hook";
import classNames from 'classnames';

type PropType = {
  ref?: Ref<object>,
  userInfo?: UserType,
  liveDetail: (LiveType & {duration?: string}) | null,
  getDetail: () => void,
}
export default function Live({liveDetail, userInfo, getDetail}: PropType) {
  const {id} = useParams()
  const [timeCount] = useTimeCount(liveDetail?.liveStartTime as Date)
  const isInLiveTime = useMemo(() => {
    return (liveDetail?.status === 'scheduled' && liveDetail?.startTime && liveDetail?.endTime && (dayjs() > dayjs(liveDetail?.startTime).subtract(20, 'minutes') && dayjs() < dayjs(liveDetail?.endTime)))
  }, [liveDetail])
  const streamControl = useMediaStream()
  const {
    videoRef,
    audioRef,
    cameraRef,
  } = streamControl
  const {
    microphoneTrack,
    targetMicrophone,
    targetShareScreen,
    targetCamera,
    liveRoomInfo,
    socketIo,
    hasRemoteStreamTracks,
    hasCameraStreamTracks,
  } = useSocketIo({
    id,
    userInfo,
    liveDetail,
    getDetail,
    streamControl
  })

  const toTargetMicrophone = () => {
    if(socketIo) {
      targetMicrophone(socketIo)
    }
  }
  const toShareScreen = () => {
    if(socketIo) {
      targetShareScreen(socketIo)
    }
  }
  const toTargetCamera = () => {
    if(socketIo) {
      targetCamera(socketIo)
    }
  }
  

  return (
    <div className="video-box relative flex w-full h-full flex-col">
      <div className="info flex justify-between p-2 border-t border-t-gray-100">
        <span className="font-[600]">{liveDetail?.title}</span>
        <Space>
          <span>直播时长：{liveDetail?.status === 'live' ? timeCount : liveDetail?.duration}</span>
          <span>看过：{liveRoomInfo.historyPersonCount || 0}</span>
          <span>在线：{liveRoomInfo.personCount || 0}</span>
        </Space>
      </div>
      {(liveDetail?.status && ['ended', 'paused'].includes(liveDetail?.status)) && <div className="absolute left-0 top-0 w-full h-full text-center pt-30 z-10">
        <span className="font-[600] text-xl">
          {liveDetail?.status === 'ended' ? '直播结束' : '直播暂停'}
        </span>
      </div>}
      <div className="tv-box relative w-full bg-gray-100 flex-1 h-0">
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
      {userInfo?._id === liveDetail?.instructorId && <div className="control w-full bg-black bottom-0 text-white text-center">
        <Space>
          <div className="text-center">
            <span className="text-white p-4 text-lg cursor-pointer" onClick={toTargetMicrophone}>
              {microphoneTrack && <AudioOutlined /> || <AudioMutedOutlined />}
            </span>
            <p>
              {microphoneTrack ? '关闭麦克风' : '麦克风'}
            </p>
          </div>
          <div className="text-center">
            <span className="text-white p-4 text-lg cursor-pointer" onClick={toShareScreen}>
              {hasRemoteStreamTracks && <PauseOutlined /> || <VideoCameraAddOutlined />}
            </span>
            <p>
              {hasRemoteStreamTracks ? '暂停共享' : '共享屏幕'}
            </p>
          </div>
          <div className="text-center">
            <span className="text-white p-4 text-lg cursor-pointer" onClick={toTargetCamera}>
              {hasCameraStreamTracks && <PauseOutlined /> || <CameraOutlined />}
            </span>
            <p>
              {hasCameraStreamTracks ? '关闭摄像头' : '摄像头'}
            </p>
          </div>
        </Space>
      </div>}
      {liveDetail?.status === 'scheduled' && 
        <div className="w-full h-full absolute top-0 left-0 flex justify-center items-center bg-slate-500/50">
          {
            isInLiveTime && <span>点击右上角开始按钮，开始直播</span>
              || <span>直播未开始</span>
          }
        </div>
      }
      {/* <div className="info-box1 bg-green-100">2</div>
      <div className="info-box2 bg-red-100">3</div> */}
    </div>
  )
}