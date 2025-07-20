import 'module-alias/register'
import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import registRouters, { isWhiteList } from './routers';
import { errorHandler } from './middleware';
import { authenticateToken } from './middleware/jwt';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next()
})
app.use((req: Request, res: Response, next: NextFunction) => {
  if (isWhiteList(req.url)) {
    return next()
  }
  authenticateToken(req, res, next);
});

registRouters(app)

app.use((req: Request, res: Response) => {
  res.status(404).send({error: 'not found'})
})

app.use(errorHandler)

export default app