import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const httpsOptions = {
  key: readFileSync(resolve(__dirname, './pem/server.key')),
  cert: readFileSync(resolve(__dirname, './pem/server.crt')),
}
export default {
  serverPort: process.env.PORT || 3004,
  httpsOptions,
  // mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mooc',
};