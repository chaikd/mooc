'use client'
import LiveVideo from "@/modules/live/live";
import LiveChat from "@/modules/live/chat";
import { useParams } from "next/navigation";
import { useEffect, useState} from 'react';
import request from "@/services/request";

export default function MLive({}) {
  const {id} = useParams()
  const [liveInfo, setLiveInfo] = useState(undefined)
  const [userInfo, setUserInfo] = useState(undefined)
  const getCourseInfo = async () => {
    const liveInfo = await request.get(`/api/live/${id}`).then(res => {
      return res?.data
    })
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
    console.log('in mobile-page')
    getCourseInfo()
    window.addEventListener('message', onMessage)
    window.parent.postMessage({
      type: 'getInfo',
    }, '*');
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])
  return (
    <div className="flex flex-col h-screen">
      <div className="live-container min-h-[250px]">
        <LiveVideo {...{
          liveDetail: liveInfo,
          userInfo,
          isMobile: true
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