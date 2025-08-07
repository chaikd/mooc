import * as mediasoup from 'mediasoup'
import { Router } from 'mediasoup/types'

let worker: mediasoup.types.Worker | undefined
const mediasoupRouters = new Map()
const weakData = new Map()

const createMesiasoupRouter = async (): Promise<mediasoup.types.Router> => {
  if (!worker) {
    worker = await mediasoup.createWorker()
  }
  const reouter = await worker.createRouter({
    mediaCodecs: [
      { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
      // { kind: 'video', mimeType: 'video/H264', clockRate: 90000,
      //   parameters: {
      //     'packetization-mode': 1,
      //     'profile-level-id': '42e01f'
      //   }
      // }
    ]
  })
  return reouter
}

const getRoomDbMaps = async (roomId: string) => {
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
    roomWeakData.set('consumerMap', new Map())
    roomWeakData.set('plainTransportMap', new Map())
  }
  const transportsMap = roomWeakData.get('transportsMap')
  const recvTransportsMap = roomWeakData.get('recvTransportsMap')
  const rtpCapabilitiesMap = roomWeakData.get('rtpCapabilitiesMap')
  const producerMap = roomWeakData.get('producerMap')
  const consumerMap = roomWeakData.get('consumerMap')
  const plainTransportMap = roomWeakData.get('plainTransportMap')

  return {
    transportsMap,
    recvTransportsMap,
    rtpCapabilitiesMap,
    producerMap,
    consumerMap,
    plainTransportMap,
    mediasoupRouter
  }
}

export const clearRoomDbMaps = (roomId: string) => {
  mediasoupRouters.delete(roomId)
  weakData.delete(roomId)
}

export {
  getRoomDbMaps
}
