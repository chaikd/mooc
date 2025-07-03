import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import logger from '@/utils/looger';
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  if (createHttpError.isHttpError(err)) {
    statusCode = err.statusCode;
    message = err.message;
  }
  logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${message}`);
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message,
    },
  });
};