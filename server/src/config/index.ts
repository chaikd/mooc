import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
export default {
  serverPort: process.env.PORT || 3000,
  // mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mooc',
};