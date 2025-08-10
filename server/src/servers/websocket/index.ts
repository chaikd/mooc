import { Server } from "http";
import { Server as SocketServer } from "socket.io";
import createChatIo from "./chat.ts";
import createLiveIo from "./live.ts";


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
};

