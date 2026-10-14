import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { checkPromssion, errorHandler } from './middleware/index.ts';
import { authenticateToken } from './middleware/jwt/index.ts';
import registRouters, { isWhiteList } from './routers/index.ts';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
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

app.use((req: Request, res: Response, next: NextFunction) => {
  checkPromssion(req, res, next)
})

// 静态资源访问（HLS 播放文件，白名单免鉴权）：
// playlist 用 no-cache，每次回源拿最新窗口；分片用 no-store——
// 每代分片编号从 001 重开，任何缓存都会把上一代同名分片喂给新一代观众（3.25 不变量 3）
const tmpHlsPath = join(process.cwd(), 'tmp', 'hls')
app.use('/hls', express.static(tmpHlsPath, {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', filePath.endsWith('.m3u8') ? 'no-cache' : 'no-store')
  },
}))

registRouters(app)

app.use((req: Request, res: Response) => {
  res.status(404).send({error: 'not found'})
})

app.use(errorHandler)

export default app