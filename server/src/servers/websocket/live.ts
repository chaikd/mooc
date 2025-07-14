import { Router } from "mediasoup/node/lib/RouterTypes"
import { Server } from "socket.io"
import { createMesiasoupRouter } from "../mediasoup";

export default async function createLiveIo(ioServer: Server) {
  const liveIo = ioServer.of('/ws/live')
  
  let mediasoupRouter: Router | null = null
  const transportsMap = new WeakMap()
  const recvTransportsMap = new WeakMap()
  const rtpCapabilitiesMap = new WeakMap()
  const producerMap = new Map()
  
  try {
    // 尝试创建 mediasoup router
    mediasoupRouter = await createMesiasoupRouter()
  } catch (error) {
    if (error instanceof Error && error.message) {
      console.warn(' Mediasoup not available:', error.message)
    }
  }
  liveIo.on('connect', async (socket) => {
    const roomId: string = socket.handshake.query.roomId as string
    socket.join(roomId)
    
    // 发送连接确认消息
    socket.emit('connected', { message: 'WebSocket connected successfully', socketId: socket.id })

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
        
        try {
          if (direction === 'send') {
            transportsMap.set(socket, transport)
          } else {
            recvTransportsMap.set(socket, transport)
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.message) {
            console.warn('Failed to save transport to Redis:', error.message)
          }
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
          transport.connect({dtlsParameters})
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
      const producer = await transport.produce({kind, rtpParameters, appData})
      cb({ id: producer.id })
      if(!producerMap.has(roomId)) {
        producerMap.set(roomId, new Set())
      }
      producerMap.get(roomId).add(producer)
      liveIo.to(roomId).emit('produceDown')
      socket.on('disconnect', () => {
        producerMap.set(roomId, new Set())
        liveIo.to(roomId).emit('produceDown')
      })
    })

    socket.on('getProduces', (_, cb) => {
      const roomId: string = socket.handshake.query.roomId as string
      const produces = [...producerMap.get(roomId)].map(producer => {
        return {
          id: producer.id
        }
      })
      cb({produces})
    })
    socket.on('getConsumer', async ({producerId}, cb) => {
      const rtp = rtpCapabilitiesMap.get(socket)
      if(rtp && mediasoupRouter?.canConsume({producerId, rtpCapabilities: rtp })) {
        const recvTrans = recvTransportsMap.get(socket)
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
    })

    socket.on('close', async () => {
      transportsMap.delete(socket)
      recvTransportsMap.delete(socket)
      rtpCapabilitiesMap.delete(socket)
    })
  })
  return liveIo
}