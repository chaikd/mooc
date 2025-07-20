import mongoose from 'mongoose';
import config from '../config';
import logger from '../utils/logger';
const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(config.mongoUri);
      logger.info('MongoDB connected');
    } catch (error) {
      logger.error('MongoDB connection error', error);
      process.exit(1);
    }
  }
};
export default connectDB;