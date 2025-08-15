import { connectDB } from '@mooc/db-shared/index.ts';
import { createServer } from 'http';
import app from './app.ts';
import './config/index';
import { createWebsocketServer } from './servers/websocket/index.ts';

const server = createServer(app)
const port = process.env.PORT
server.listen(port, () => {
  connectDB()
  createWebsocketServer(server)
  console.log(`Server running at http://localhost:${port}`);
});