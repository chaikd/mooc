import { findAvailableUdpPort } from "@/utils/visiblePort";
import { Consumer, PlainTransport, Producer, Router } from "mediasoup/types";

export interface PlainTransportListItemType {
  consumer: Consumer,
  plainTransport: PlainTransport,
  ffmpegPort: number,
  ffmpegRtcpPort: number
}

export async function createPlainTransport(mediasoupRouter: Router, producerList: {producer: Producer, type: string}[]) {
  const datas = producerList.map(async (item, k) => {
    const ffmpegPort = (await findAvailableUdpPort(50000, 60000)) + k * 2;
    const ffmpegRtcpPort = await findAvailableUdpPort(ffmpegPort + 1);
    const plainTransport = await mediasoupRouter.createPlainTransport({
      listenInfo: {
        ip: '127.0.0.1',
        protocol: 'udp',
      },
      rtcpMux  : false,
      comedia  : false // 非自动模式
    });
    const consumer = await plainTransport.consume({
      producerId: item.producer.id,
      rtpCapabilities: mediasoupRouter.rtpCapabilities,
      paused: true
    });
    await consumer.resume();
    item.producer.on('@close', () => {
      consumer.close()
      plainTransport.close()
    })
    return {
      consumer,
      plainTransport,
      ffmpegPort,
      ffmpegRtcpPort
    }
  })

  const list = await Promise.all(datas)

  return list
}