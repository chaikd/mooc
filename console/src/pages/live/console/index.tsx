import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, message, Space } from "antd";
import { Link, useParams } from "react-router";
import './index.scss'
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { editLive, getLiveDetail, LiveType } from "@/api/live";
import { formatMillisecondsToTime } from "@/utils/date";
import Live from "./components/live";
import LiveChat from "./components/chat";
import { useSelector } from "react-redux";
import { StoreType } from "@/store";
import dayjs from "dayjs";

export default function LiveConsole() {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const {id} = useParams()
  const [liveDetail, setLiveDetail] = useState<(LiveType & {duration?: string}) | null>(null)
  const liveRef = useRef<{startLive: () => void, closeLive: () => void, exchangeView: () => void} | null>(null)
  const chatRef = useRef<{closeLive: () => void} | null>(null)
  const userInfo = useSelector((state: StoreType) => state.user.info)
  const getDetail = async () => {
    if (!id) return
    const res = await getLiveDetail(id)
    const duration = dayjs(res.liveEndTime).valueOf() - dayjs(res.liveStartTime).valueOf()
    setLiveDetail({
      ...res,
      duration: formatMillisecondsToTime(duration)
    })
  }
  const startLive = async () => {
    const res = await editLive({
      ...liveDetail as LiveType,
      status: 'live',
      liveStartTime: new Date()
    })
    if(res.success) {
      message.success('开始直播')
      liveRef?.current?.startLive()
    }
  }
  const closeLive = async () => {
    const res = await editLive({
      ...liveDetail as LiveType,
      status: 'ended',
      liveEndTime: new Date()
    })
    if(res.success) {
      message.success('结束直播')
      liveRef?.current?.closeLive()
      chatRef?.current?.closeLive()
    }
  }
  const exchangeView = async () => {
    liveRef?.current?.exchangeView()
  }
  const isShowActionBtn = (status: 'scheduled' | 'live' | 'ended') => {
    return liveDetail?.status !=='ended' && userInfo._id === liveDetail?.instructorId && liveDetail?.status === status
  }
  useEffect(() => {
    getDetail()
  }, [])
  return (
    <>
      <div className={classNames('flex flex-col h-full',{
        'fixed w-screen h-screen left-0 top-0 bg-white p-4': isFullScreen
      })}>
        <div className="flex justify-between items-center">
          <div>
            <Link to="/live"><ArrowLeftOutlined />返回列表</Link>
            <span className="ml-2 font-[600]">控制台</span>
          </div>
          <Space>
            <Button onClick={() => setIsFullScreen(!isFullScreen)}>{isFullScreen ? `退出全屏` : '全屏'}</Button>
            {/* <Button>设置</Button> */}
            {isShowActionBtn('live') && <Button onClick={exchangeView}>切换画面</Button>}
            {isShowActionBtn('scheduled') && <Button onClick={startLive}>开始直播</Button>}
            {isShowActionBtn('live') && <Button onClick={closeLive}>结束直播</Button>}
          </Space>
        </div>
        <div className="flex-1 h-0 mt-2">
          <div className="flex h-full">
            <div className="flex-1 h-full mr-4">
              <Live {...{
                liveDetail,
                ref: liveRef,
                getDetail,
                userInfo
              }}></Live>
            </div>
            <div className="message-box border border-gray-100 h-full">
              <LiveChat {...{
                ref: chatRef,
                liveDetail
              }}></LiveChat>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}