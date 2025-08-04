'use client'
import LiveVideo from "@/modules/live/live";
import LiveChat from "@/modules/live/chat";
import { liveInfoAction } from "@/services/live";
import { useParams } from "next/navigation";
import { useEffect, useState} from 'react';
// import Cookies from 'js-cookie'

export default function MLive({}) {
  const {id} = useParams()
  // const pathname = usePathname()
  const [liveInfo, setLiveInfo] = useState(undefined)
  const [userInfo, setUserInfo] = useState(undefined)
  const getCourseInfo = async () => {
    const liveInfo = await liveInfoAction(id)
    setLiveInfo(liveInfo)
  }
  const onMessage = ({data: {type, userInfo}}) => {
      // if(type === 'token'){
      //   Cookies.set('authorization', token, {
      //     path: pathname,
      //     expires: 1,
      //     secure: true,
      //     sameSite: 'Lax',
      //   })
      // }
      if(type === 'info') {
        setUserInfo(userInfo)
      }
    }
  useEffect(() => {
    getCourseInfo()
    window.addEventListener('message', onMessage)
    window.parent.postMessage({
      type: 'getInfo',
    }, '*');
    return () => {
      window.removeEventListener('message', onMessage)
      // Cookies.remove('authorization')
    }
  }, [])
  return (
    <div className="flex flex-col h-screen">
      <div className="live-container">
        <LiveVideo {...{
          liveDetail: liveInfo,
          userInfo
        }}></LiveVideo>
      </div>
      <div className="chat-container flex-1 h-0">
        <LiveChat {...{
          liveDetail: liveInfo,
          userInfo
        }}></LiveChat>
      </div>
    </div>
  )
}