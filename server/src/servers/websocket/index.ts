import { logger } from "@mooc/db-shared/index.ts";
import { Server } from "http";
import { Server as SocketServer } from "socket.io";
import { liveRoomManager, startRoomMetricsReporter } from "../live-room/room-manager.ts";
import { mediasoupManager } from "../mediasoup/manager.ts";
import createChatIo from "./chat.ts";
import createLiveIo from "./live.ts";

let signalsRegistered = false;

/** 进程退出时统一回收房间与 mediasoup 资源（只注册一次） */
function registerLifecycleSignals() {
  if (signalsRegistered) {
    return;
  }
  signalsRegistered = true;

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ message: 'server shutting down', signal, rooms: liveRoomManager.roomCount });
    try {
      await liveRoomManager.closeAll(signal);
      await mediasoupManager.shutdown();
    } catch (error) {
      logger.error({
        message: 'shutdown failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    process.exit(0);
  };

  process.on('SIGINT', (signal) => {
    void shutdown(signal);
  });
  process.on('SIGTERM', (signal) => {
    void shutdown(signal);
  });
}

const createWebsocketServer = async (appServer: Server) => {
  const ioServer = new SocketServer(appServer, {
    cors: {
      origin: ['*']
    }
  })

  // mediasoup worker 异常退出：房间资源已随之失效，统一收敛为关闭态
  mediasoupManager.configure({
    onWorkerDied: () => liveRoomManager.closeAll('mediasoup worker died'),
  })
  registerLifecycleSignals()
  startRoomMetricsReporter()

  createLiveIo(ioServer) // liveIo
  createChatIo(ioServer) // chatIo

  return ioServer
}

export {
  createWebsocketServer
};
