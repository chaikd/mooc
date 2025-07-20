import { createServer } from 'http';
import app from './app'
import env from './config'
// import { connectDB } from './utils';
import { connectDB } from '@mooc/db-shared'
import { createWebsocketServer } from './servers/websocket';

const server = createServer(app)
server.listen(env.serverPort, () => {
  connectDB()
  createWebsocketServer(server)
  console.log(`Server running at http://localhost:${env.serverPort}`);
}); 