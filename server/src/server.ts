import { createServer } from 'http';
import app from './app.ts';
import env from './config/index.ts';
// import { connectDB } from './utils';
import { connectDB } from '@mooc/db-shared/index.ts';
import { createWebsocketServer } from './servers/websocket/index.ts';

const server = createServer(app)
server.listen(env.serverPort, () => {
  connectDB()
  createWebsocketServer(server)
  console.log(`Server running at http://localhost:${env.serverPort}`);
}); 