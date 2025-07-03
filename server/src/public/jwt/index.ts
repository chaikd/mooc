import { Request,Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import {readFileSync} from 'fs'
import { join } from 'path';

// JWT 校验中间件
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // const authHeader = req.headers['Authorization'] as string | undefined;
  var token = req.cookies.authorization; 
  if (!token) return res.status(401).json({ message: '暂无权限' });
  let cert = readFileSync(join(__dirname, './pem/public_key.pem'))
    jwt.verify(token, cert, {algorithms: ['RS256']}, (err: jwt.VerifyErrors | null, data: any) => {
    if (err) return res.status(403).json({ message: '请重新登陆' });
    (req as any).userId = data.data;
    next();
  });
}

// 生成jwt
function generateToken(data: string) {
  let created = Math.floor(Date.now() / 1000);
  let cert = readFileSync(join(__dirname, './pem/private_key.pem'))
  const token = jwt.sign({
    data,
    exp: created + 60 * 60 * 12,
  }, cert, {algorithm: 'RS256'})
  return token
}

export {
  authenticateToken,
  generateToken
}