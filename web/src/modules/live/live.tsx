"use client"
import { Space } from "antd";
import { Device, DtlsParameters, Transport, TransportOptions } from "mediasoup-client/types";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getConsumer, getProduces, getReport, getRouterRtpCapabilities } from "@/services/live/socketio";
import { useLocalProducers, useMediaStream } from "@/services/live/live-hook";
import { LiveType, UserType } from "@mooc/db-shared";
import { useTimeCount } from "@/utils/date";
import { useParams } from "next/navigation";

type PropType = {
  liveDetail: (LiveType & {duration?: string}) | null
  userInfo: UserType | undefined
}

type LiveRoomInfo = {
  personCount?: number
  historyPersonCount?: number
}

export default function LiveVideo({liveDetail, userInfo}: PropType) {
  const {
    sendTransport,
    recvTransport,
    setSendTransport,
    setRecvTransport,
    clearLocalProducers,
    localProducers,
  } = useLocalProducers()
  const {
    videoRef,
    addTrackToRemote,
    clearRemoteStream,
    clearLocalStream,
  } = useMediaStream()
  const [timeCount] = useTimeCount(liveDetail?.liveStartTime as Date)
  const socketio = useRef<Socket | null>(null)
  const [liveRoomInfo, setLiveRoomInfo] = useState<LiveRoomInfo>({})
  const {id} = useParams()
  const closeVideo = async () => {
    clearLocalStream()
    sendTransport?.close()
    recvTransport?.close()
    clearLocalProducers()
  }

  const ioConnect = async () => {
    socketio.current = io('http://localhost:3000/ws/live', {
      query: {
        roomId: id
      },
      transports: ['websocket', 'polling']
    })
    const socket = socketio.current

    socket.on('liveRoomInfo', (data) => {
      setLiveRoomInfo(pre => ({
        ...pre,
        ...data
      }))
    })
    const device = new Device()
    const routerRtpCapabilities = await getRouterRtpCapabilities(socket)
    await device.load(routerRtpCapabilities)
    // 创建发送report
    const sendTransportInfo = await getReport(socket, 'send') as TransportOptions
    const sendTransport: Transport = device.createSendTransport(sendTransportInfo)
    setSendTransport(sendTransport)
    // 创建接收report
    const recvTransportInfo = await getReport(socket, 'recv') as TransportOptions
    const recvTransport: Transport = device.createRecvTransport(recvTransportInfo)
    setRecvTransport(recvTransport)

    sendTransport.on('connect', ({ dtlsParameters }: {dtlsParameters: DtlsParameters}, cb: () => void) => {
      socket.emit('transportConnected', { transportId: sendTransport.id, dtlsParameters, rtpCapabilities: device.rtpCapabilities }, cb);
    })

    recvTransport.on('connect', ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, cb: () => void) => {
      socket.emit('transportConnected', { recvTransportId: recvTransport.id, dtlsParameters }, cb);
    })

    // eslint-disable-next-line no-unused-vars
    sendTransport.on('produce', ({ kind, rtpParameters, appData }, cb: (obj: {id: string}) => void) => {
      socket.emit('produce', { transportId: sendTransport.id, recvTransportId: recvTransport.id,kind, rtpParameters, appData, rtpCapabilities: device.rtpCapabilities  }, ({id}: {id: string}) => cb({id}))
    })

    const parseConsumer = async (producerId: string) => {
      const consumer = await getConsumer(socket, producerId, device.rtpCapabilities);
      if (!recvTransport) return;
      const { track } = await recvTransport.consume(consumer);
      addTrackToRemote(track)
      if(userInfo) {
        socket.emit('recordUser', ({id: userInfo?._id, username: userInfo?.username, role: userInfo?.roleInfo?.code}))
      }
    }
    const produceReadyFn = () => {
      let timer: null | NodeJS.Timeout = null
      return () => {
        if(timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(async () => {
          const { produces } = await getProduces(socket)
          produces.forEach(async item => {
            const producerId = item.id
            await parseConsumer(producerId)
          })
        }, 500)
      }
    }

    socket.on('produceReady', produceReadyFn())

    socket.on('produceClosed', () => {
      clearRemoteStream()
    })

    socket.on('liveEnded', () => {
      sendTransport.close()
      recvTransport.close()
      socket.disconnect()
    })

    if(liveDetail?.status === 'live' && (userInfo?._id as string) !== (liveDetail.instructorId as unknown as string)) {
      const getProduce = produceReadyFn()
      getProduce()
    }
  }
  
  useEffect(() => {
    ioConnect()
    return () => {
      closeVideo()
      const socket = socketio.current
      socket?.disconnect()
    }
  }, [id])

  return (
    <div className="video-box relative flex w-full h-full flex-col">
      {liveDetail?.status === 'ended' && <div className="absolute left-0 top-0 w-full h-full text-center pt-20">
        <span className="font-[600] text-xl">直播已结束</span>
      </div>}
      {
        localProducers.current.size === 0 && <div className="absolute left-0 top-0 w-full h-full text-center pt-20">
          <span className="font-[600] text-xl">暂无直播</span>
        </div>
      }
      <video
        ref={videoRef}
        className="w-full bg-gray-100 flex-1 h-0"
        autoPlay
        playsInline
        muted
      ></video>
      <div className="info flex justify-between p-2 border-t border-t-gray-100">
        <span>{liveDetail?.title}</span>
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