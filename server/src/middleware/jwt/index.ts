import { NextFunction, Request, Response } from 'express';
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export interface RequestTypeWithJWT extends Request {
  userId?: string
}
const public_key = join(__dirname, './pem/public_key.pem')
const private_key = join(__dirname, './pem/private_key.pem')

// JWT 校验中间件
function authenticateToken(req: RequestTypeWithJWT, res: Response, next: NextFunction) {
  // const authHeader = req.headers['Authorization'] as string | undefined;
  const token = req.cookies.authorization; 
  if (!token) return res.status(401).json({ message: '暂无权限' });
  const cert = readFileSync(public_key)
    jwt.verify(token, cert, {algorithms: ['RS256']}, (err, data) => {
      if (err) return res.status(403).json({ message: '请重新登陆' });
      if(typeof data === 'object' && Reflect.has(data, 'data')) {
        req.userId = data?.data as string;
      }
      next();
    });
  }

// 生成jwt
function generateToken(data: string) {
  const created = Math.floor(Date.now() / 1000);
  const cert = readFileSync(private_key)
  const token = jwt.sign({
    data,
    exp: created + 60 * 60 * 12,
  }, cert, {algorithm: 'RS256'})
  return token
}

export {
  authenticateToken,
  generateToken
};
