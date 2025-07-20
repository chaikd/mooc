import { Server } from "socket.io";
import {redisRequest} from "@mooc/db-shared";

export default async function createChatIo(ioServer: Server) {
  const chatIo = ioServer.of('/ws/chat')

  chatIo.on('connect', (socket) => {
    const roomId = socket.handshake.query.roomId as string
    socket.join(roomId)

    socket.on('messageSend', async (data) => {
      const room = socket.handshake.query.roomId as string
      const key = `${room}:messages`
      await redisRequest.redisClient?.rPush(key, data)
      chatIo.to(roomId).emit('message', data)
    })
    socket.on('messageAll', async () => {
      const room = socket.handshake.query.roomId as string
      const key = `${room}:messages`
      const all = await redisRequest.redisClient?.lRange(key, 0, -1)
      socket.emit('messageList', all)
    })
    socket.on('closeLive', async () => {
      await chatIo.to(roomId).emit('closeLive')
      await chatIo.to(roomId).socketsLeave(roomId)
    })
  })

  return chatIo
}