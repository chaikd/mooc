import { NextRequest } from 'next/server'
import { authenticateToken } from './middlewares/jwt'

export function middleware(request: NextRequest) {
  return authenticateToken(request)
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/api/auth/user',
    '/api/auth/logout'
  ],
}