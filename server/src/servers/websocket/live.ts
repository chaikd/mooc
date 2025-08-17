import { redisRequest } from "@mooc/db-shared/index.ts";
import { Producer } from "mediasoup-client/types";
import { Transport } from "mediasoup/types";
import { Server } from "socket.io";
import { isFFmpeg, startFFmpeg, stopFFmpeg } from "../ffmpeg/index.ts";
import { clearRoomDbMaps, getRoomDbMaps } from "../mediasoup/index.ts";
import { createPlainTransport } from "../mediasoup/transcoder.ts";

export default async function createLiveIo(ioServer: Server) {
  const liveIo = ioServer.of('/ws/live')
  
  liveIo.on('connect', async (socket) => {
    const roomId: string = socket.handshake.query.roomId as string
    await socket.join(roomId)
    const {
      transportsMap,
      recvTransportsMap,
      rtpCapabilitiesMap,
      producerMap,
      consumerMap,
      plainTransportMap,
      mediasoupRouter
    } = await getRoomDbMaps(roomId)
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
    
    // transport 链接
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
          listenInfos: [{ 
            protocol: 'udp',
            ip: '0.0.0.0',
            announcedAddress: process.env.WEBRTC_TRANSPORT_IP,
            exposeInternalIp: true
          },{ 
            protocol: 'tcp',
            ip: '0.0.0.0',
            announcedAddress: process.env.WEBRTC_TRANSPORT_IP,
            exposeInternalIp: true
          }],
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

    // producer 处理
    socket.on('produce', async ({ kind, rtpParameters, appData }, cb) => { 
      const roomId: string = socket.handshake.query.roomId as string
      const transport = transportsMap.get(socket)
      const producer = await transport?.produce({kind, rtpParameters, appData})
      if(producer) {
        cb({ id: producer?.id })
        producerMap.set(producer.id, {
          producer,
          type: appData.type,
        })
        await executeFFmpag()
        await liveIo.to(roomId).emit('newProduce', { producerId: producer.id, kind, appData })
        socket.on('disconnect', () => {
          [...producerMap.values()].forEach((item) => {
            item.producer.close()
          })
          producerMap.clear()
          liveIo.to(roomId).emit('producerClosed', {})
        })
      }
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
          consumerMap.set(producerId, consum)
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
    socket.on('closeProducer', async ({producerId, appData}) => {
      const producer = producerMap.get(producerId)?.producer
      const consumer = consumerMap.get(producerId)
      consumer?.close()
      producer?.close()
      producerMap.delete(producerId)
      consumerMap.delete(producerId)
      await executeFFmpag()
      liveIo.to(roomId).emit('producerClosed', {producerId, appData})
    })
    socket.on('getProduces', (_, cb) => {
      const producers = producerMap ? [...producerMap.values()] as {producer:Producer,type: string}[] : []
      const produces = producers.map(({producer, type}) => {
        return {
          id: producer.id,
          type
        }
      })
      cb({produces})
    })
    
    socket.on('hlsStream', (_, cb) => {
      const roomId: string = socket.handshake.query.roomId as string
      if(isFFmpeg(roomId)) {
        cb({ type: 'hls-ready', url: `/hls/${roomId}/playlist_live.m3u8?v=${new Date().getTime()}` });
      }
    })
    socket.on('closeLive', async (_, cb) => {
      const producers = producerMap.values()
      if (producers) {
        for(const item of producers) {
          await item?.producer?.close()
        }
      }
      producerMap.clear()
      await liveIo.to(roomId).emit('liveEnded')
      await liveIo.to(roomId).socketsLeave(roomId)
      await mediasoupRouter.close()
      clearRoomDbMaps(roomId)
      if(cb) {
        cb()
      }
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
      await liveIo.to(roomId).emit('liveRoomInfo', await getLiveInfo())
    })
    //  执行ffmpag
    async function executeFFmpag() {
      await new Promise((resolve) => {setTimeout(resolve, 200)}).then(() => {})
      if(producerMap.size <= 0) {
        console.log('close ffmpeg')
        await stopFFmpeg(roomId)
        return
      }
      const allProducer = [...producerMap.values()]
      const camera = allProducer.find(v => v.type === 'camera')
      const producerList = [...producerMap.values()].filter(item => {
        return item.type !== 'camera'
      })
      if(!producerList.some(v => v.type.startsWith('screen')) && camera) {
        producerList.push(camera)
      }
      const plainTransportList = await createPlainTransport(mediasoupRouter, producerList)
      plainTransportMap.set(roomId, plainTransportList)
      try{
        await Promise.all(plainTransportList.map(item => item.consumer.resume()))
      }catch(err) {
        console.log('consumer start error:', err)
      }
      startFFmpeg({
        plainTransportList,
        roomId,
        onStart: () => {
          // 连接 PlainTransport到FFmpeg指定的端口
          plainTransportList.forEach(item => {
            item.plainTransport.connect({
              ip: '127.0.0.1',
              port: item.ffmpegPort,
              rtcpPort: item.ffmpegRtcpPort,
            });
          })
        },
        onOpening: () => {
          socket.to(roomId).emit('ffmpegReady')
        },
        onExit: () => {
          plainTransportList.forEach(item => {
            item.consumer.close()
            item.plainTransport.close();
          })
          plainTransportMap.delete(roomId)
          liveIo.to(roomId).emit('ffmpegStoped')
        }
      })
      console.log('▶️ mediasoup → FFmpeg RTP/RTCP 发包已开启');
    }
  })
  return liveIo
}