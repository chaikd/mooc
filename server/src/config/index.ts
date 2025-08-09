import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = process.env.NODE_ENV || 'development';
const envPath = env === 'development' ? '../../.env' : '../../.env.production'
dotenv.config({ path: path.join(__dirname, envPath) });
export default {
  serverPort: process.env.PORT || 3000,
  // mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mooc',
};