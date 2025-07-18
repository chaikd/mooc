import { Server } from "http";
import { Server as SocketServer } from "socket.io";
import createLiveIo from "./live";
import createChatIo from "./chat";


const createWebsocketServer = async (appServer: Server) => {
  const ioServer = new SocketServer(appServer, {
    cors: {
      origin: ['*']
    }
  })

  createLiveIo(ioServer) // liveIo
  createChatIo(ioServer) // chatIo
}

export {
  createWebsocketServer
}
