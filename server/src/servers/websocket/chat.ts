import { Server } from "socket.io";
import redisRequest from "../redis";

export default async function createChatIo(ioServer: Server) {
  let chatIo = ioServer.of('/ws/chat')

  chatIo.on('connect', (socket) => {
    const roomId = socket.handshake.query.roomId as string
    socket.join(roomId)
    console.log('connect chat', roomId)

    socket.on('message:send', async (data) => {
      const room = socket.handshake.query.id as string
      console.log(data)
      // let saveData = {
      //   ...data,
      //   createTime: new Date()
      // }
      let key = `${room}:messages`
      await redisRequest.redisClient?.lPush(key, data)
      chatIo.to(roomId).emit('message', data)
    })
    socket.on('message:all', async () => {
      const room = socket.handshake.query.id as string
      let key = `${room}:messages`
      const len = await redisRequest.redisClient?.lLen(key) as number
      let all = await redisRequest.redisClient?.lRange(key, 0, len)
      socket.emit('message', all)
    })
  })

  return chatIo
}