import { Router } from "mediasoup/node/lib/RouterTypes"
import { Server } from "socket.io"
import { createMesiasoupRouter } from "../mediasoup";
import { Producer } from "mediasoup-client/lib/Producer";
import { Transport } from "mediasoup/node/lib/types";
import {redisRequest} from "@mooc/db-shared";
import { startFFmpeg } from "../ffmpeg";
import { createPipeTransport } from "../mediasoup/transcoder";

export default async function createLiveIo(ioServer: Server) {
  const liveIo = ioServer.of('/ws/live')
  
  const mediasoupRouters = new Map()
  const weakData = new Map()
  
  liveIo.on('connect', async (socket) => {
    const roomId: string = socket.handshake.query.roomId as string
    await socket.join(roomId)
    let mediasoupRouter = mediasoupRouters.get(roomId)
    if (!mediasoupRouter) {
      try {
        // 尝试创建 mediasoup router
        const newMediasoupRouter: Router = await createMesiasoupRouter()
        mediasoupRouters.set(roomId, newMediasoupRouter)
        mediasoupRouter = newMediasoupRouter
      } catch (error) {
        if (error instanceof Error && error.message) {
          console.warn(' Mediasoup not available:', error.message)
        }
      }
    }
    let roomWeakData = weakData.get(roomId)
    if (!roomWeakData) {
      roomWeakData = new Map()
      weakData.set(roomId, roomWeakData)
      roomWeakData.set('transportsMap', new WeakMap())
      roomWeakData.set('recvTransportsMap', new WeakMap())
      roomWeakData.set('rtpCapabilitiesMap', new WeakMap())
      roomWeakData.set('producerMap', new Map())
    }
    const transportsMap = roomWeakData.get('transportsMap')
    const recvTransportsMap = roomWeakData.get('recvTransportsMap')
    const rtpCapabilitiesMap = roomWeakData.get('rtpCapabilitiesMap')
    const producerMap = roomWeakData.get('producerMap')
    
    const getLiveInfo = async () => {
      const room = liveIo.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;
      const historyPersonCount = await redisRequest.redisClient?.sCard(`${roomId}:userIds`)
      return {
        personCount: numClients,
        historyPersonCount
      }
    }

    // 发送连接确认消息
    socket.emit('connected', { message: 'WebSocket connected successfully', socketId: socket.id })
    await liveIo.to(roomId).emit('liveRoomInfo', await getLiveInfo())
    
    socket.on('getRtpCapabilities', (_, cb) => {
      if (mediasoupRouter) {
        cb({ routerRtpCapabilities: mediasoupRouter.rtpCapabilities });
      } else {
        cb({ error: 'Mediasoup not available' });
      }
    });

    socket.on('getReport', async ({direction}, cb) => {
      if (!mediasoupRouter) {
        cb({ error: 'Mediasoup not available' });
        return;
      }
      
      try {
        const transport = await mediasoupRouter.createWebRtcTransport({
          listenIps: [{ ip: '127.0.0.1' }],
          enableUdp: true,
          enableTcp: true,
          appData: {direction}
        })
        
        if (direction === 'send') {
          transportsMap.set(socket, transport)
        } else {
          recvTransportsMap.set(socket, transport)
        }
        
        cb({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (error) {
        console.error('Failed to create transport:', error)
        cb({ error: 'Failed to create transport' });
      }
    })

    socket.on('transportConnected', async ({transportId, recvTransportId, dtlsParameters, rtpCapabilities}, cb) => {
      try {
        if(transportId) {
          const transport = transportsMap.get(socket)
          transport.connect({dtlsParameters})
          rtpCapabilitiesMap.set(socket, rtpCapabilities)
        } else if(recvTransportId) {
          const transport = recvTransportsMap.get(socket)
          transport.connect({ dtlsParameters })
        }
        cb({ success: true })
      } catch (error) {
        console.error('Transport connect error:', error)
        cb({ error: 'Failed to connect transport' })
      }
    })

    socket.on('produce', async ({ kind, rtpParameters, appData }, cb) => {
      const roomId: string = socket.handshake.query.roomId as string
      const transport = transportsMap.get(socket)
      const producer = await transport?.produce({kind, rtpParameters, appData})
      cb({ id: producer.id })
      producerMap.set(producer.id, producer)
      await liveIo.to(roomId).emit('produceReady')

      const {plainTransport, consumer} = await createPipeTransport(mediasoupRouter, producer)
      const {ffmpegPort, ffmpegRtcpPort} = await startFFmpeg({plainTransport, roomId, consumer})
      // 连接 PlainTransport到FFmpeg指定的端口
      await plainTransport.connect({
        ip: '127.0.0.1',
        port: ffmpegPort,
        rtcpPort: ffmpegRtcpPort,
      });
      console.log('▶️ mediasoup → FFmpeg RTP/RTCP 发包已开启');
    
      socket.on('disconnect', () => {
        producerMap.clear()
        liveIo.to(roomId).emit('produceReady')
      })
    })

    socket.on('getProduces', (_, cb) => {
      const producers = producerMap ? [...producerMap.values()] as Producer[] : []
      const produces = producers.map((producer) => {
        return {
          id: producer.id
        }
      })
      cb({produces})
    })
    socket.on('hlsStream', (_, cb) => {
      const roomId: string = socket.handshake.query.roomId as string
      cb({ type: 'hls-ready', url: `/hls/${roomId}/playlist_live.m3u8` });
    })
    socket.on('produceClose', ({ produceId }, cb) => {
      const producer = producerMap.get(produceId)
      if (producer) {
        producer.close()
      }
      producerMap.delete(produceId)
      liveIo.to(roomId).emit('produceClosed', {produceId})
      cb()
    })
    socket.on('getConsumer', async ({producerId, rtpCapabilities}, cb) => {
      const rtp = rtpCapabilities ? rtpCapabilities : rtpCapabilitiesMap.get(socket)
      if(rtp && mediasoupRouter?.canConsume({producerId, rtpCapabilities: rtp })) {
        const recvTrans = recvTransportsMap.get(socket) as Transport
        if (recvTrans) {
          const consum = await recvTrans.consume({
            producerId,
            rtpCapabilities: rtp,
            paused: false
          })
          // await consum.resume()
          cb({
            id: consum.id,
            producerId,
            kind: consum.kind,
            rtpParameters: consum.rtpParameters
          })
        }
      }
    })
    socket.on('closeLive', async (_, cb) => {
      const producers = producerMap.values()
      if (producers) {
        for(const producer of producers) {
          await producer.close()
        }
      }
      producerMap.clear()
      await liveIo.to(roomId).emit('liveEnded')
      await liveIo.to(roomId).socketsLeave(roomId)
      await mediasoupRouter.close()
      mediasoupRouters.delete(roomId)
      weakData.delete(roomId)
      cb()
    })
    socket.on('recordUser', async (userInfo) => {
      await redisRequest.redisClient?.sAdd(`${roomId}:userIds`, userInfo.id)
      liveIo.to(roomId).emit('liveRoomInfo', await getLiveInfo())
    })
    socket.on('disconnect', async () => {
      await socket.leave(roomId)
      transportsMap.delete(socket)
      recvTransportsMap.delete(socket)
      rtpCapabilitiesMap.delete(socket)
    })
  })
  return liveIo
}