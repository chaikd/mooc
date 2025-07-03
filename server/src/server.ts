import { createServer } from 'http';
import app from './app'
import env from './config'
import { connectDB } from './utils';

const server = createServer(app)
server.listen(env.serverPort, () => {
  connectDB()
  console.log(`Server running at http://localhost:${env.serverPort}`);
}); 