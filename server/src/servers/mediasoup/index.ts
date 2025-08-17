import * as mediasoup from 'mediasoup'
import { Router } from 'mediasoup/types'

let worker: mediasoup.types.Worker | undefined
const mediasoupRouters = new Map()
const weakData = new Map()

const createMediasoupRouter = async (): Promise<mediasoup.types.Router> => {
  if (!worker) {
    worker = await mediasoup.createWorker()
    worker.on('died', () => {
      console.error('mediasoup Worker died, exiting...');
      process.exit(1);
    });
  }
  const reouter = await worker.createRouter({
    mediaCodecs: [
				{
					kind      : 'audio',
					mimeType  : 'audio/opus',
					clockRate : 48000,
					channels  : 2
				},
        {
					kind       : 'video',
					mimeType   : 'video/h264',
					clockRate  : 90000,
					parameters :
					{
						'packetization-mode'      : 1,
						'profile-level-id'        : '4d0032',
						'level-asymmetry-allowed' : 1,
						'x-google-start-bitrate'  : 1000
					}
				},
				{
					kind       : 'video',
					mimeType   : 'video/h264',
					clockRate  : 90000,
					parameters :
					{
						'packetization-mode'      : 1,
						'profile-level-id'        : '42e01f',
						'level-asymmetry-allowed' : 1,
						'x-google-start-bitrate'  : 1000
					}
				},
				{
					kind       : 'video',
					mimeType   : 'video/VP8',
					clockRate  : 90000,
					parameters :
					{
						'x-google-start-bitrate' : 1500
					}
				},
				{
					kind       : 'video',
					mimeType   : 'video/VP9',
					clockRate  : 90000,
					parameters :
					{
						'profile-id'             : 2,
						'x-google-start-bitrate' : 1000
					}
				},
			]
  })
  process.on('SIGINT', async () => {
    await worker?.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await worker?.close();
    process.exit(0);
  });
  return reouter
}

const getRoomDbMaps = async (roomId: string) => {
  let mediasoupRouter = mediasoupRouters.get(roomId)
  if (!mediasoupRouter) {
    try {
      // 尝试创建 mediasoup router
      const newMediasoupRouter: Router = await createMediasoupRouter()
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
