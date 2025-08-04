import { generateUUID } from "@/utils/uuid"
import { LiveType, UserType } from "@mooc/db-shared"
import { AppData, Consumer, Device, DtlsParameters, RtpCapabilities, Transport, TransportOptions } from "mediasoup-client/types"
import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { ProducerTypes, useMediasoup, UseMediaStreamType } from "./live-hook"

type LiveRoomInfo = {
  personCount?: number
  historyPersonCount?: number
}

export function useSocketIo({
    id,
    userInfo,
    liveDetail,
    streamControl,
  }: {
    id: string | undefined,
    userInfo?: UserType,
    liveDetail?: (LiveType & {duration?: string}) | null,
    streamControl: UseMediaStreamType
  }) {
  const socketio = useRef<Socket | null>(null)
  const [liveRoomInfo, setLiveRoomInfo] = useState<LiveRoomInfo>({})
  const {
      setSendTransport,
      setRecvTransport,
      microphoneTrack,
      targetMicrophone,
      targetShareScreen,
      targetCamera,
      addConsumer,
      removeConsumer,
      hasRemoteStreamTracks,
      hasCameraStreamTracks,
      resetStreamState,
      removeAllConsumer,
    } = useMediasoup({
      streamControl
    })

  const {
    remoteStream,
    microStream,
    cameraStream,
  } = streamControl

  const ioConnect = async () => {
    if(!id) {
      return
    }
    socketio.current = io('http://localhost:3000/ws/live', {
      query: {
        roomId: id
      },
      transports: ['websocket', 'polling']
    })
    const socket = socketio.current

    socket.on('connected', () => {
      let user: Partial<UserType> = {
        ...userInfo,
        role: userInfo?.roleInfo?.code,
      }
      if(!userInfo?._id) {
        const id = generateUUID()
        user = {
          _id: id,
          username: '游客',
          role: 'unknown'
        }
      }
      socket.emit('recordUser', ({
        id: user?._id,
        username: user?.username,
        role: user?.roleInfo?.code
      }))
    })
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

    const addTrackToStream = async ({producerId, appData}: {
      producerId: string, appData: {
        type: ProducerTypes
      }
    }) => {
      const track = await parseConsumer(producerId, appData)
      if (track) {
        let stream
        if (appData.type === 'microphone') {
          stream = microStream
        }
        if (appData.type?.startsWith('screen')) {
          stream = remoteStream
        }
        if(appData.type === 'camera') {
          stream = cameraStream
        }
        stream?.current?.addTrack(track)
        console.log(appData.type)
        resetStreamState(appData.type)
      }
    }
    
    socket.on('newProduce', addTrackToStream)
    
    const parseConsumer = async (producerId: string, appData: {type: ProducerTypes}) => {
      const consumer = await getConsumer(socket, producerId, device.rtpCapabilities);
      if (!recvTransport) return;
      const localConsumer = await recvTransport.consume(consumer);
      addConsumer(producerId, {
        consumer: localConsumer, 
        type: appData.type
      })
      return localConsumer.track
    }
    socket.on('producerClosed', async ({producerId}) => {
      if(producerId) {
        await removeConsumer(producerId)
      } else {
        removeAllConsumer()
      }
    })

    const produceReadyFn = () => {
      let timer: null | NodeJS.Timeout = null
      return () => {
        if(timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(async () => {
          const { produces } = await getProduces(socket)
          produces.forEach(async item => {
            if(item) {
              const producerId = item?.id
              if(item.type) {
                addTrackToStream({
                  producerId,
                  appData: {
                    type: item.type,
                  }
                })
              }
            }
          })
        }, 500)
      }
    }

    if(liveDetail?.status === 'live') {
      const getProduce = produceReadyFn()
      getProduce()
    }

    socket.on('liveEnded', () => {
      sendTransport.close()
      recvTransport.close()
      socket.disconnect()
    })
  }

  useEffect(() => {
    ioConnect()
    return () => {
      socketio.current?.disconnect()
    }
  }, [id])

  return {
    liveRoomInfo,
    microphoneTrack,
    hasRemoteStreamTracks,
    socketIo: socketio.current,
    targetMicrophone,
    targetShareScreen,
    targetCamera,
    hasCameraStreamTracks,
  }
}

export function getRouterRtpCapabilities<T extends {routerRtpCapabilities: RtpCapabilities}>(socket: Socket): Promise<T> {
  return requestWs(socket, 'getRtpCapabilities')
}

export function getReport(socket: Socket, direction: 'send' | 'recv') {
  return requestWs(socket, 'getReport', {direction})
}

export function getProduces(socket: Socket): Promise<{produces: {id: string, type: ProducerTypes}[]}> {
  return requestWs(socket, 'getProduces')
}

export function getConsumer(socket: Socket, producerId: string, rtpCapabilities?: RtpCapabilities): Promise<Consumer<AppData>> {
  return requestWs(socket, 'getConsumer', {producerId, rtpCapabilities})
}

export function requestWs<T>(socket: Socket, event: string, data?: Record<string, string | object | undefined>): Promise<T> {
  return new Promise(resolve => socket.emit(event, data, resolve))
}

