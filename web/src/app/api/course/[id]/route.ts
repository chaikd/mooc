import { connectDB, Course, User } from "@mooc/db-shared";
import { findOneDoc } from "@mooc/db-shared/src/utils/database/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  let course = await findOneDoc(Course, { _id: id });
  if (course) {
    course = course.toObject();
    const instructorId = course.instructorId;
    const instructor = await findOneDoc(
      User,
      { _id: instructorId },
      "username _id role roleCode cover"
    );
    if (instructor) {
      course.instructor = instructor;
    }
  }
  return NextResponse.json({
    success: true,
    data: course,
  });
}
