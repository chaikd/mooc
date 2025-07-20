import jwt from 'jsonwebtoken';
import {readFileSync} from 'fs'
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export interface RequestTypeWithJWT extends Request {
  userId?: string
}
const public_key = join(process.cwd(), process.env.PUBLIC_KEY_PATH as string)
const private_key = join(process.cwd(), process.env.PRIVATE_KEY_PATH as string)

// JWT 校验中间件
async function authenticateToken(req: NextRequest) {
  const token = await req.cookies.get('authorization')
  // if (!token) return NextResponse.json({ message: '暂无权限' }, { status: 401 });
  if (!token) {
    const loginUrl = new URL('/', req.url)
    return NextResponse.redirect(loginUrl)
  }
  const cert = readFileSync(public_key);
  const newHeaders = new Headers(req.headers)
  try {
    const tokenValue = typeof token === 'string' ? token : token.value;
    const decoded = await jwt.verify(tokenValue, cert, { algorithms: ['RS256'] });
    if (typeof decoded === 'object' && Reflect.has(decoded, 'data')) {
      newHeaders.set('userId', decoded?.data as string)
    }
  } catch (err) {
    return NextResponse.json({ message: '请重新登陆' , err}, { status: 403 });
  }
  return NextResponse.next({
        request: {
          headers: newHeaders,
        },
      })
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
}