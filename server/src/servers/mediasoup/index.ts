import * as mediasoup from 'mediasoup'

let worker: mediasoup.types.Worker | undefined

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

export {
  createMesiasoupRouter
}