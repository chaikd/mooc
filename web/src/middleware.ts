import { NextRequest, NextResponse } from 'next/server'
import { authenticateToken } from './middlewares/jwt'

export function middleware(request: NextRequest) {
  request.headers.set('Access-Control-Allow-Origin', '*')
  request.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  request.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 })
  }
  return authenticateToken(request)
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/api/auth/user',
    '/api/auth/logout'
  ],
}