import { connectDB, Course, User } from "@mooc/db-shared";
import { countDocs, findAll, findDocs } from "@mooc/db-shared/src/utils/database/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await connectDB()
  // eslint-disable-next-line prefer-const
  let {query, page, pageSize} = await req.json()
  const filter = {statusCode: 2}
  query = query || {}
  Object.keys(query).forEach(prop => {
    filter[prop] = {
      $regex: query[prop],
      $options: 'i'
    }
  })
  let courseList = await findDocs(Course, filter, pageSize, page)
  const total = await countDocs(Course, filter)
  if(courseList) {
    const instructorIds = [
      ...new Set(courseList.map((v) => v.instructorId.toString())),
    ];
    const instructors = await findAll(
      User,
      {
        _id: { $in: instructorIds },
      },
      "username _id role roleCode"
    );
    courseList = courseList.map((v) => {
      const obj = {
        ...v.toObject(),
      };
      return {
        ...obj,
        instructor: instructors.find(
          (item) => item._id.toString() === obj.instructorId.toString()
        ),
      };
    })
    return NextResponse.json({
      success: true,
      data: {
        courseList,
        page,
        pageSize,
        total
      }
    })
  }
  return NextResponse.json({
    success: false,
    message: '请求失败'
  })
}