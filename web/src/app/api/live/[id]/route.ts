import { connectDB, Live, User } from "@mooc/db-shared";
import { findOneDoc } from "@mooc/db-shared/src/utils/database/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  await connectDB()
  const {id} = await params
  let liveInfo = await findOneDoc(Live, {_id: id})
  if(liveInfo) {
    liveInfo = liveInfo.toObject();
    const instructorId = liveInfo.instructorId;
    const instructor = await findOneDoc(
      User,
      { _id: instructorId },
      "username _id role roleCode cover"
    );
    if (instructor) {
      liveInfo.instructor = instructor;
    }
    return NextResponse.json({
      success: true,
      data: liveInfo
    })
  }
  return NextResponse.json({
    success: false,
    message: "请求失败"
  })
}