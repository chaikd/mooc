import { parseToken } from "@/middlewares/jwt"
import { connectDB, User } from "@mooc/db-shared"
import { findOneDoc } from "@mooc/db-shared/src/utils/database/actions"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  await connectDB()
  const {token} = await req.json()
  const userId = await parseToken(token)
  if (userId) {
    const userInfo = await findOneDoc(User, { _id: userId })
    if (userInfo._id) {
      return NextResponse.json({
        success: true,
        data: userInfo
      })
    }
  }
  return NextResponse.json({success: false, message: '当前用户不存在'})
}