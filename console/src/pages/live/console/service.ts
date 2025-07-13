import { AppData, ConsumerOptions, RtpCapabilities } from "mediasoup-client/types"
import { Socket } from "socket.io-client"

export function getRouterRtpCapabilities<T extends {routerRtpCapabilities: RtpCapabilities}>(socket: Socket): Promise<T> {
  return requestWs(socket, 'getRtpCapabilities')
}

export function getReport(socket: Socket, direction: 'send' | 'recv') {
  return requestWs(socket, 'getReport', {direction})
}

export function getProduces(socket: Socket) {
  return requestWs(socket, 'getProduces')
}

export function getConsumer(socket: Socket, producerId: string): Promise<ConsumerOptions<AppData>> {
  return requestWs(socket, 'getConsumer', {producerId})
}

export function requestWs(socket: Socket, event: string, data?: Record<string, any>): Promise<any> {
  return new Promise(resolve => socket.emit(event, data, resolve))
}