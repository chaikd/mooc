import { Space } from "antd";
import { Ref, useImperativeHandle, useMemo } from "react";
import { useTimeCount } from "@/utils/date";
import { useParams } from "react-router";
import { AudioMutedOutlined, AudioOutlined, CameraOutlined, PauseOutlined, VideoCameraAddOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import classNames from 'classnames';
import { LiveType, useMediaStream, UserType, useSocketIo } from "@mooc/live-service";

type PropType = {
  ref?: Ref<{
    closeLive: () => void
  }>,
  userInfo?: UserType,
  liveDetail: (LiveType & {duration?: string}) | null,
  getDetail: () => void,
}
export default function Live({liveDetail, userInfo, getDetail, ref}: PropType) {
  const {id} = useParams()
  const [timeCount] = useTimeCount(liveDetail?.liveStartTime as Date)
  const isInLiveTime = useMemo(() => {
    return (liveDetail?.status === 'scheduled' && liveDetail?.startTime && liveDetail?.endTime && (dayjs() > dayjs(liveDetail?.startTime).subtract(20, 'minutes') && dayjs() < dayjs(liveDetail?.endTime)))
  }, [liveDetail])
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
    controlState,
    closeCurrentLive,
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

  const closeLive = () => {
    closeCurrentLive()
  }
  useImperativeHandle(ref, () => ({
    closeLive
  }))

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
      {(!hasRemoteStreamTracks && !hasCameraStreamTracks && !microphoneTrack) && <div className="absolute left-0 top-0 w-full h-full text-center pt-30 z-1">
        <span className="font-[600] text-xl">
          {tipText}
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
      {(
        userInfo?._id === liveDetail?.instructorId
        && liveDetail?.status === 'live'
        ) && <div className="control w-full bg-black bottom-0 text-white text-center z-2">
        <Space>
          <div className="text-center">
            <span className="text-white p-4 text-lg cursor-pointer" onClick={toTargetMicrophone}>
              {(controlState.microphoneState && <AudioOutlined />) || <AudioMutedOutlined />}
            </span>
            <p>
              {controlState.microphoneState ? '关闭麦克风' : '麦克风'}
            </p>
          </div>
          <div className="text-center">
            <span className="text-white p-4 text-lg cursor-pointer" onClick={toShareScreen}>
              {(controlState.screenState && <PauseOutlined />) || <VideoCameraAddOutlined />}
            </span>
            <p>
              {controlState.screenState ? '暂停共享' : '共享屏幕'}
            </p>
          </div>
          <div className="text-center">
            <span className="text-white p-4 text-lg cursor-pointer" onClick={toTargetCamera}>
              {(controlState.cameraState && <PauseOutlined />) || <CameraOutlined />}
            </span>
            <p>
              {controlState.cameraState ? '关闭摄像头' : '摄像头'}
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