import * as mediasoup from 'mediasoup'

let worker: mediasoup.types.Worker | undefined

const createMesiasoupRouter = async (): Promise<mediasoup.types.Router> => {
  if (!worker) {
    worker = await mediasoup.createWorker()
  }
  const reouter = await worker.createRouter({
    mediaCodecs: [
      { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 }
    ]
  })
  return reouter
}

export {
  createMesiasoupRouter
}