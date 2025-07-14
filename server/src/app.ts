import 'module-alias/register'
import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { authenticateToken } from './middleware/jwt';
import registRouters, { isWhiteList } from './routers';
import { errorHandler } from './middleware';

const app: any = express();

app.use(express.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (isWhiteList(req.url)) {
    next()
    return
  }
  authenticateToken(req, res, next);
});

registRouters(app)

app.use((req: Request, res: Response) => {
  res.status(404).send({error: 'not found'})
})

app.use(errorHandler)

export default app