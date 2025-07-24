'use client'
import { Producer, Transport } from "mediasoup-client/types";
import { useEffect, useRef, useState } from "react";

export function useMediaStream() {
  let remoteStream
  // const [remoteStream, setRemotStream] = useState<MediaStream | null>(new MediaStream())
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);

  const setVideoSrc = (stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }

  const setLocalStream = (stream: MediaStream) => {
    localStream.current = stream
  }

  const addTrackToRemote = (track: MediaStreamTrack) => {
    remoteStream?.addTrack(track);
  }

  const clearRemoteStream = () => {
    if (remoteStream) {
      const tracks = remoteStream.getTracks()
      tracks.forEach(v => {
        v.stop()
        remoteStream.removeTrack(v)
      })
    }
  }

  const clearLocalStream = () => {
    localStream?.current?.getTracks().forEach(track => {
      track.stop()
      localStream.current?.removeTrack(track)
    })
  }

  useEffect(() => {
    remoteStream = new MediaStream()
    setVideoSrc(remoteStream)
  }, []);

  return {
    videoRef,
    setVideoSrc,
    localStream,
    remoteStream,
    setLocalStream,
    addTrackToRemote,
    clearRemoteStream,
    clearLocalStream,
  }
}

export function useLocalProducers() {
  const [sendTransport, setSendTransport] = useState<Transport | null>(null)
  const [recvTransport, setRecvTransport] = useState<Transport | null>(null)
  const localProducers = useRef<Map<string, Producer>>(new Map())

  const startLocalProducer = async (track: MediaStreamTrack, onTrackEnd: (producer: Producer) => void = () => {}) => {
    try {
      track.onended = async () => {
        track.stop()
        const producer = localProducers.current.get(track.kind)
        if (producer) {
          await producer?.close()
          localProducers.current.delete(track.kind)
          onTrackEnd(producer)
        }
        // await socket.emit('produceClose', { produceId: producer?.id }, () => {
        //   clearLocalStream()
        //   clearRemoteStream()
        // })
      }
      // 目前功能只有一个讲师可以共享视频，暂时按一个stream并且track类型只包含一个video和一个audio来保存producer
      const oldProducer = localProducers.current.get(track.kind)
      if (oldProducer) {
        oldProducer.replaceTrack({track})
      } else {
        const producer = await sendTransport?.produce({ track }) as Producer;
        localProducers.current.set(track.kind, producer)
      }
    } catch (e) {
      console.error('produce error', e);
    }
  }

  const getLocalProducer = (id: string) => {
    return localProducers.current.get(id)
  }

  const clearLocalProducers = () => {
    localProducers.current.values().forEach((producer: Producer) => {
      producer.close()
    })
    localProducers.current.clear()
  }

  return {
    sendTransport,
    startLocalProducer,
    recvTransport,
    setSendTransport,
    setRecvTransport,
    clearLocalProducers,
    getLocalProducer,
    localProducers,
  }
}