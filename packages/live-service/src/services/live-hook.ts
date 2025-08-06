import { getMediaStream } from "@/utils/media/stream";
import { Consumer, Producer, Transport } from "mediasoup-client/types";
import { RefObject, useEffect, useReducer, useRef, useState } from "react";
import { Socket } from "socket.io-client";

export type ProducerTypes = 'microphone' | 'camera' | 'screen-video' | 'screen-audio'
interface ProducerMapItem {
  type: ProducerTypes,
  producer: Producer
}

export type ControlStateNamesType = 'microphoneState' | 'screenState' | 'cameraState'

export interface UseMediaStreamType {
  videoRef: RefObject<HTMLVideoElement | null>,
  audioRef: RefObject<HTMLVideoElement | null>,
  cameraRef: RefObject<HTMLVideoElement | null>,
  microStream: RefObject<MediaStream | null>,
  remoteStream: RefObject<MediaStream | null>,
  cameraStream: RefObject<MediaStream | null>,
}

export function useMediaStream(): UseMediaStreamType {
  const remoteStream = useRef<MediaStream | null>(null)
  const microStream = useRef<MediaStream | null>(null)
  const cameraStream = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const setSrcObject = (stream: MediaStream, ref: HTMLVideoElement | null) => {
    if (ref) {
      ref.srcObject = stream
    }
  }

  const initStreams = () => {
    if (remoteStream.current) {
      setSrcObject(remoteStream.current, videoRef.current)
    }
    if(microStream.current) {
      setSrcObject(microStream.current, audioRef.current)
    }
    if(cameraStream.current) {
      setSrcObject(cameraStream.current, cameraRef.current)
    }
  }

  useEffect(() => {
    remoteStream.current = new MediaStream()
    microStream.current = new MediaStream()
    cameraStream.current = new MediaStream()
    new Promise(resolve => setTimeout(resolve, 100)).then(() => {
      initStreams()
    })
    return () => {
      remoteStream.current = null
      microStream.current = null
      cameraStream.current = null
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

function stateReducer(state: {
  microphoneState: boolean,
  screenState: boolean,
  cameraState: boolean,
}, action: {
  type: ControlStateNamesType,
  stateType: boolean
}) {
  return {
    ...state,
    [action.type]: action.stateType
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
  const [microphoneTrack, setMicrophoneTrack] = useState(false)
  const [hasRemoteStreamTracks, setHasRemoteStreamTracks] = useState(false)
  const [hasCameraStreamTracks, setHasCameraStreamTracksmTracks] = useState(false)
  const [controlState, dispatchState] = useReducer(stateReducer, {
    microphoneState: false,
    screenState: false,
    cameraState: false
  })
  const {
    remoteStream,
    microStream,
    cameraStream
  } = streamControl
  const getStream = (type: ProducerTypes) => {
    return type === 'microphone' ? microStream : type === 'camera' ? cameraStream : remoteStream
  }

  const resetStreamState = (type: ProducerTypes | undefined) => {
    new Promise(resolve => {setTimeout(resolve, 500)}).then(() => {
    console.log(type)
      if(type && type === 'camera' && cameraStream?.current) {
    console.log(type, cameraStream?.current?.getTracks())
        setHasCameraStreamTracksmTracks(cameraStream?.current?.getTracks().length > 0)
      }
      if(type?.startsWith('screen') && remoteStream?.current) {
        setHasRemoteStreamTracks(remoteStream?.current?.getTracks().length > 0)
      }
      if(type === 'microphone' && microStream?.current) {
        if(microStream) {
          setMicrophoneTrack(microStream?.current?.getTracks().length > 0)
        }
      }
    })
  }

  const resetControlState = ({
    type,
    stateType
  }: {
    type: ControlStateNamesType,
    stateType: boolean
  }) => {
    dispatchState({
      type,
      stateType
    })
  }

  const targetMicrophone = async (socketIo: Socket) => {
    if(microphoneTrack) {
      removeProducer('microphone')
      resetControlState({
        type: 'microphoneState',
        stateType: false
      })
      return
    }
    const stream = await getMediaStream('user', 'audio')
    const micTrack = stream?.getTracks()[0]
    await producerControl(socketIo, micTrack, 'microphone')
  }

  const targetShareScreen = async (socketIo: Socket) => {
    if(hasRemoteStreamTracks) {
      removeProducer('screen')
      resetControlState({
        type: 'screenState',
        stateType: false
      })
      return
    }
    const stream = await getMediaStream('display', 'both')
    const tracks = stream.getTracks()
    tracks.forEach(async track => {
      const type = track.kind === 'video' ? 'screen-video' : 'screen-audio'
      producerControl(socketIo ,track, type)
    })
  }

  const targetCamera = async (socketIo: Socket) => {
    if(hasCameraStreamTracks) {
      removeProducer('camera')
      resetControlState({
        type: 'cameraState',
        stateType: false
      })
      return
    }
    const stream = await getMediaStream('user', 'video')
    const track = stream.getTracks()[0]
    producerControl(socketIo, track, 'camera')
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
        socketIo.emit('closeProducer', {producerId: producer.id, appData: {
          type
        }})
      });
    }
  }

  const removeProducer = (type: ProducerTypes | 'screen') => {
    const producers = [...producersMap.current.values()].filter(item => item.type.startsWith(type))
    producers.forEach(item => {
      const stream = type && getStream(item.type)
      if(item.producer.track) {
        item.producer.track?.stop()
        stream?.current?.removeTrack(item.producer.track)
      }
      item.producer.close()
      producersMap.current.delete(item.producer.id)
    })
  }

  const removeAllProducers = () => {
    [...producersMap.current.values()].forEach(item => {
      removeProducer(item.type)
    })
  }
  
  const removeConsumer = (producerId: string) => {
    const { consumer, type } = consumersMap.current.get(producerId) || {};
    const stream = type && getStream(type)
    if(consumer?.track) {
      consumer?.track.stop()
      stream?.current?.removeTrack(consumer?.track)
    }
    consumer?.close()
    resetStreamState(type)
    consumersMap.current.delete(producerId)
  }

  const removeAllConsumer = () => {
    [...consumersMap.current.keys()].forEach(async id => {
      await removeConsumer(id)
    })
  }

  const addConsumer = (producerId: string, data: {
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
    resetStreamState,
    resetControlState,
    addConsumer,
    controlState,
    removeAllConsumer,
    removeAllProducers,
  }
}