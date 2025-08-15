import mongoose from 'mongoose';
import logger from '../utils/logger/index.ts';
function getEnvMONGOURI(): string {
  // server
  if (process.env?.MONGO_URI) {
    return process.env.MONGO_URI;
  }
  // web
  if (process.env.NEXT_PUBLIC_MONGO_URI) {
    return process.env.NEXT_PUBLIC_MONGO_URI;
  }
  return 'mongodb://127.0.0.1:27017/mooc'
}
const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(getEnvMONGOURI() as string);
      logger.info('MongoDB connected');
    } catch (error) {
      logger.error('MongoDB connection error', error);
      process.exit(1);
    }
  }
};
export default connectDB;