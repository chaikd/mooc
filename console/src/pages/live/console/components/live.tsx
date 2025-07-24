import { LiveType } from "@/api/live";
import { Space } from "antd";
import { Device, DtlsParameters, Producer, Transport, TransportOptions } from "mediasoup-client/types";
import { Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getConsumer, getProduces, getReport, getRouterRtpCapabilities } from "../services/socketio";
import { UserType } from "@/api/user";
import { useLocalProducers, useMediaStream } from "../services/live-hook";
import { useTimeCount } from "@/utils/date";
import { useParams } from "react-router";

type PropType = {
  liveDetail: (LiveType & {duration?: string}) | null
  ref: Ref<object>
  // id: string | undefined
  getDetail: () => void
  userInfo: UserType
}

type LiveRoomInfo = {
  personCount?: number
  historyPersonCount?: number
}

export default function Live({liveDetail, ref, getDetail, userInfo}: PropType) {
  const {
    sendTransport,
    startLocalProducer,
    recvTransport,
    setSendTransport,
    setRecvTransport,
    clearLocalProducers,
  } = useLocalProducers()
  const {
    videoRef,
    setLocalStream,
    addTrackToRemote,
    clearRemoteStream,
    clearLocalStream,
  } = useMediaStream()
  useImperativeHandle(ref, () => ({
    startLive,
    closeLive,
    exchangeView
  }))
  const [timeCount] = useTimeCount(liveDetail?.liveStartTime as Date)
  const socketio = useRef<Socket | null>(null)
  const [liveRoomInfo, setLiveRoomInfo] = useState<LiveRoomInfo>({})
  const {id} = useParams()

  const startLive = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
    for (const track of stream.getTracks()) {
      startLocalProducer(track, onLocalProducerEnded)
    }
    setLocalStream(stream)
  }

  const closeVideo = async () => {
    clearLocalStream()
    sendTransport?.close()
    recvTransport?.close()
    clearLocalProducers()
  }

  const onLocalProducerEnded = async (producer: Producer) => {
    const socket = socketio.current
    await socket?.emit('produceClose', { produceId: producer?.id }, () => {
      clearLocalStream()
      clearRemoteStream()
    })
  }

  const exchangeView = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    })
    for (const track of stream.getTracks()) {
      startLocalProducer(track, onLocalProducerEnded)
    }
    setLocalStream(stream)
  }

  const closeLive = async () => {
    const socket = socketio.current
    await socket?.emit('closeLive')
    await closeVideo()
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

    sendTransport.on('produce', ({ kind, rtpParameters, appData }, cb: (obj: {id: string}) => void) => {
      socket.emit('produce', { transportId: sendTransport.id, recvTransportId: recvTransport.id,kind, rtpParameters, appData, rtpCapabilities: device.rtpCapabilities  }, ({id}: {id: string}) => cb({id}))
    })

    const parseConsumer = async (producerId: string) => {
      const consumer = await getConsumer(socket, producerId, device.rtpCapabilities);
      if (!recvTransport) return;
      const { track } = await recvTransport.consume(consumer);
      addTrackToRemote(track)
      socket.emit('recordUser', ({id: userInfo._id, username: userInfo.username, role: userInfo.roleInfo?.code}))
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
      getDetail()
    })

    if(liveDetail?.status === 'live' && userInfo._id !== liveDetail.instructorId) {
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