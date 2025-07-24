import { connectDB, CourseChapter } from "@mooc/db-shared"
import { findAll } from "@mooc/db-shared/src/utils/database/actions";
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const {id} = await params
  let response
  try {
    const chapters = await findAll(CourseChapter, { courseId: id });
    if (chapters) {
      response = NextResponse.json({
        success: true,
        data: chapters,
      });
    }
  } catch (error) {
    response = NextResponse.json({
      success: false,
      error,
    });
  }
  return response
}