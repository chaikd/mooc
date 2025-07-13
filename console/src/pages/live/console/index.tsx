import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Space } from "antd";
import { Link, useParams } from "react-router";
import './index.scss'
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { getLiveDetail, LiveType } from "@/api/live";
import { formatMillisecondsToTime } from "@/utils/date";
import Live from "./components/live";
import LiveChat from "./components/chat";

export default function LiveConsole() {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const {id} = useParams()
  const [liveDetail, setLiveDetail] = useState<(LiveType & {duration?: string}) | null>(null)
  const liveRef = useRef(null)
  const getDetail = async () => {
    if (!id) return
    const res = await getLiveDetail(id)
    const duration = new Date(res.endTime).getTime() - new Date(res.startTime).getTime()
    setLiveDetail({
      ...res,
      duration: formatMillisecondsToTime(duration)
    })
  }
  const startLive = () => {
    (liveRef?.current as any).startLive()
  }
  useEffect(() => {
    getDetail()
  }, [])
  return (
    <>
      <div className={classNames('flex flex-col min-h-full',{
        'fixed w-screen h-screen left-0 top-0 bg-white p-4': isFullScreen
      })}>
        <div className="flex justify-between items-center">
          <div>
            <Link to="/live"><ArrowLeftOutlined />返回列表</Link>
            <span className="ml-2 font-[600]">控制台</span>
          </div>
          <Space>
            <Button onClick={() => setIsFullScreen(!isFullScreen)}>{isFullScreen ? `退出全屏` : '全屏'}</Button>
            {/* <Button>设置</Button>
            <Button>切换画面</Button> */}
            <Button onClick={startLive}>开始直播</Button>
            <Button>结束直播</Button>
          </Space>
        </div>
        <div className="flex-1 flex h-full mt-4">
          <div className="flex-1 mr-4">
            <Live {...{
              id,
              liveDetail,
              ref: liveRef
            }}></Live>
          </div>
          <div className="message-box bg-yellow-100">
            <LiveChat {...{
              id
            }}></LiveChat>
          </div>
        </div>
      </div>
    </>
  )
}