import { generateToken } from "@/middlewares/jwt";
import { md5 } from "@/utils/md5";
import { User, connectDB, mdaction } from '@mooc/db-shared';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await connectDB()
  const data = await req.json()
  try {
    const userInfo = await mdaction.findOneDoc(User,{ username: data.username, password: md5(data.password) })
    let response = NextResponse.json({
        success: false,
        message: '用户名或密码错误'
      }, {status: 401})
    if (userInfo?.toObject()?._id) {
      const token = generateToken(userInfo._id)
      response = NextResponse.json({
        success: true,
        token,
        userId: userInfo._id,
        message: '登陆成功'
      })
      response.cookies.set('authorization', token, {
        maxAge: 24*60*60 * 1000,
        httpOnly: true
      })
    }
    return response
  } catch (err) {
    console.log('userData err',err)
  }
}