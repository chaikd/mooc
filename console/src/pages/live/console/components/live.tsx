import { LiveType } from "@/api/live";
import { Space } from "antd";
import { Device, DtlsParameters, Transport } from "mediasoup-client/types";
import { Ref, useEffect, useImperativeHandle, useState } from "react";
import { io } from "socket.io-client";
import { getConsumer, getProduces, getReport, getRouterRtpCapabilities } from "../service";

type PropType = {
  liveDetail: (LiveType & {duration?: string}) | null
  ref: Ref<object>
  id: string | undefined
}

export default function Live({id, liveDetail, ref}: PropType) {
  const [sendTransport, setSendTransport] = useState<Transport | null>(null)
  const [remotStream] = useState(new MediaStream())
  useImperativeHandle(ref, () => ({
    startLive
  }))

  const socket = io('http://localhost:3000/ws/live', {
    query: {
      roomId: id
    },
    transports: ['websocket', 'polling']
  })

  const startLive = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
    for (const track of localStream.getTracks()) {
      try {
        await sendTransport?.produce({ track });
      } catch (e) {
        console.error('produce error', e);
      }
    }
  }

  const ioConnect = async () => {
    const device = new Device()
    const routerRtpCapabilities = await getRouterRtpCapabilities(socket)
    await device.load(routerRtpCapabilities)
    // 创建发送report
    const sendTransportInfo = await getReport(socket, 'send')
    const sendTransport: Transport = device.createSendTransport(sendTransportInfo)
    // 创建接收report
    const recvTransportInfo = await getReport(socket, 'recv')
    const recvTransport: Transport = device.createRecvTransport(recvTransportInfo)

    sendTransport.on('connect', ({ dtlsParameters }: {dtlsParameters: DtlsParameters}, cb: () => void) => {
      socket.emit('transportConnected', { transportId: sendTransport.id, dtlsParameters, rtpCapabilities: device.rtpCapabilities }, cb);
    })

    recvTransport.on('connect', ({ dtlsParameters }: {dtlsParameters: DtlsParameters}, cb: () => void) => {
      socket.emit('transportConnected', { recvTransportId: recvTransport.id, dtlsParameters }, cb);
    })

    sendTransport.on('produce', ({ kind, rtpParameters, appData }, cb: (obj: {id: string}) => void) => {
      socket.emit('produce', { transportId: sendTransport.id, recvTransportId: recvTransport.id,kind, rtpParameters, appData, rtpCapabilities: device.rtpCapabilities  }, ({id}: {id: string}) => cb({id}))
    })

    setSendTransport(sendTransport)

    const parseConsumer = async (producerId: string) => {
      const consumer = await getConsumer(socket,producerId)
      const {track} = await recvTransport.consume(consumer)
      remotStream.addTrack(track)
    }

    const produceDownFn = () => {
      let timer: any = null
      return () => {
        if(timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(async () => {
          const {produces}= await getProduces(socket)
          for(const item of produces) {
            const producerId = item.id
            await parseConsumer(producerId)
          }
        }, 500)
      }
    }

    socket.on('produceDown', produceDownFn())
  }
  
  useEffect(() => {
    ioConnect()
    return () => {
      socket.close()
      socket.disconnect()
    }
  }, [id])
  


  return (<div className="view-box h-full">
    <div className="video-box">
      <video
        className="w-full"
        ref={el => {
          if (el && remotStream) {
            // @ts-ignore
            el.srcObject = remotStream;
          }
        }}
        autoPlay
        playsInline
        // controls={false}
      ></video>
      <div className="info flex justify-between p-2 border-t border-t-gray-100">
        <span>{liveDetail?.title}</span>
        <Space>
          <span>时长：{liveDetail?.duration}</span>
          <span>在线人数：{100}</span>
        </Space>
      </div>
    </div>
    <div className="info-box1 bg-green-100">2</div>
    <div className="info-box2 bg-red-100">3</div>
  </div>)
}