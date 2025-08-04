import { getMediaStream } from "@/utils/media/stream";
import { Consumer, Producer, Transport } from "mediasoup-client/types";
import { Ref, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

export type ProducerTypes = 'microphone' | 'camera' | 'screen-video' | 'screen-audio'
interface ProducerMapItem {
  type: ProducerTypes,
  producer: Producer
}

export interface UseMediaStreamType {
  videoRef: Ref<HTMLVideoElement | null>,
  audioRef: Ref<HTMLVideoElement | null>,
  cameraRef: Ref<HTMLVideoElement | null>,
  microStream: MediaStream | null,
  remoteStream: MediaStream | null,
  cameraStream: MediaStream | null,
}

export function useMediaStream(): UseMediaStreamType {
  const [remoteStream] = useState<MediaStream | null>(new MediaStream())
  const [microStream] = useState<MediaStream | null>(new MediaStream())
  const [cameraStream] = useState<MediaStream | null>(new MediaStream())
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const setSrcObject = (stream: MediaStream, ref: HTMLVideoElement | null) => {
    if (ref) {
      ref.srcObject = stream
    }
  }

  useEffect(() => {
    if (remoteStream) {
      setSrcObject(remoteStream, videoRef.current)
    }
    if(microStream) {
      setSrcObject(microStream, audioRef.current)
    }
    if(cameraStream) {
      setSrcObject(cameraStream, cameraRef.current)
    }
  }, []);

  return {
    videoRef,
    audioRef,
    cameraRef,
    microStream,
    remoteStream,
    cameraStream,
  }
}

export function useMediasoup({
  streamControl
}: {
  streamControl: UseMediaStreamType
}) {
  const [sendTransport, setSendTransport] = useState<Transport | null>(null)
  const [recvTransport, setRecvTransport] = useState<Transport | null>(null)
  const producersMap = useRef<Map<string, ProducerMapItem>>(new Map())
  const consumersMap = useRef<Map<string, {consumer: Consumer,type: ProducerTypes}>>(new Map())
  const [microphoneTrack, setMicrophoneTrack] = useState<MediaStreamTrack | null>(null)
  const [hasRemoteStreamTracks, setHasRemoteStreamTracks] = useState(false)
  const [hasCameraStreamTracks, setHasCameraStreamTracksmTracks] = useState(false)
  const {
    remoteStream,
    microStream,
    cameraStream
  } = streamControl
  const getStream = (type: ProducerTypes) => {
    return type === 'microphone' ? microStream : type === 'camera' ? cameraStream : remoteStream
  }

  const resetStreamState = (type: ProducerTypes | undefined) => {
    if(type && type === 'camera' && cameraStream) {
      setHasCameraStreamTracksmTracks(cameraStream?.getTracks().length > 0)
    }
    if(type?.startsWith('screen') && remoteStream) {
      setHasRemoteStreamTracks(remoteStream?.getTracks().length > 0)
    }
  }

  const targetMicrophone = async (socketIo: Socket) => {
    if(microphoneTrack) {
      const producerItem = producersMap.current.values().find(v => {
        return v.producer?.track?.id === microphoneTrack.id
      })
      const producer = producerItem?.producer
      microphoneTrack.stop()
      setMicrophoneTrack(null)
      if(producer) {
        producer.close()
        producersMap.current.delete(producer.id)
      }
      return
    }
    const stream = await getMediaStream('user', 'audio')
    const micTrack = stream.getTracks()[0]
    await producerControl(socketIo, micTrack, 'microphone')
    setMicrophoneTrack(micTrack)
  }

  const targetShareScreen = async (socketIo: Socket) => {
    if(hasRemoteStreamTracks) {
      const producers = producersMap.current.values().filter(item => item.type.startsWith('screen'))
      producers.forEach(item => {
        item.producer.track?.stop()
        item.producer.close()
        producersMap.current.delete(item.producer.id)
      })
      return
    }
    const stream = await getMediaStream('display', 'both')
    const tracks = stream.getTracks()
    tracks.forEach(async track => {
      const type = track.kind === 'video' ? 'screen-video' : 'screen-audio'
      producerControl(socketIo ,track, type)
      new Promise(resolve => {setTimeout(resolve, 500)}).then(() => {
        resetStreamState(type)
      })
      track.onended = () => {
        resetStreamState(type)
      }
    })
  }

  const targetCamera = async (socketIo: Socket) => {
    if(hasCameraStreamTracks) {
      const item = producersMap.current.values().find(item => item.type === 'camera')
      item?.producer?.track?.stop()
      item?.producer?.close()
      if(item?.producer.id) {
        producersMap.current.delete(item?.producer.id)
      }
      return
    }
    const stream = await getMediaStream('user', 'video')
    const track = stream.getTracks()[0]
    producerControl(socketIo, track, 'camera')
    new Promise(resolve => {setTimeout(resolve, 500)}).then(() => {
      resetStreamState('camera')
    })
    track.onended = () => {
      resetStreamState('camera')
    }
  }

  const producerControl = async (socketIo: Socket, track: MediaStreamTrack,type: ProducerTypes) => {
    const producer = await sendTransport?.produce({ track , appData: {
      type
    }}) as Producer;
    if(producer) {
      producersMap.current.set(producer.id, {
        type,
        producer
      })
      producer.on('@close', () => {
        console.log('closed')
        socketIo.emit('closeProducer', {producerId: producer.id, appData: {
          type
        }})
      });
    }
  }
  
  const removeConsumer = async (producerId: string) => {
    const { consumer, type } = consumersMap.current.get(producerId) || {};
    consumer?.close()
    const stream = type && getStream(type)
    if(consumer?.track) {
      consumer?.track.stop()
      stream?.removeTrack(consumer?.track)
    }
    resetStreamState(type)
    consumersMap.current.delete(producerId)
  }

  const addConsumer = async (producerId: string, data: {
      consumer: Consumer, 
      type: ProducerTypes
    }) => {
    consumersMap.current.set(producerId, data)
    resetStreamState(data.type)
  }

  return {
    sendTransport,
    recvTransport,
    setSendTransport,
    setRecvTransport,
    microphoneTrack,
    hasRemoteStreamTracks,
    hasCameraStreamTracks,
    targetMicrophone,
    targetShareScreen,
    targetCamera,
    removeConsumer,
    addConsumer,
  }
}