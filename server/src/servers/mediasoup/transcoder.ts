import { Producer, Router } from "mediasoup/node/lib/types";

export async function createPipeTransport(mediasoupRouter: Router, producer: Producer) {
  const plainTransport = await mediasoupRouter.createPlainTransport({
    listenInfo: {
      ip: '127.0.0.1',
      protocol: 'udp',
    },
    rtcpMux  : false,
    comedia  : false // 非自动模式
  });
  const consumer = await plainTransport.consume({
    producerId: producer.id,
    rtpCapabilities: mediasoupRouter.rtpCapabilities,
    paused: true
  });
  await consumer.resume();

  return { consumer, plainTransport }
}