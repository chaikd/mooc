import { NextResponse } from "next/server";

export function GET() {
  const response = NextResponse.json({
    success: true,
    message: '退出成功'
  })
  response.cookies.set('authorization', null, {
    maxAge: 0
  })
  return response
}
