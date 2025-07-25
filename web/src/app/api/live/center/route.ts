import { connectDB, Live, User } from "@mooc/db-shared";
import { countDocs, findAll, findDocs } from "@mooc/db-shared/src/utils/database/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await connectDB()
  // eslint-disable-next-line prefer-const
  let {page, pageSize, query} = await req.json()
  const filter = {}
  query = query || {}
  Object.keys(query).forEach(prop => {
    filter[prop] = {
      $regex: query[prop],
      $options: 'i'
    }
  })
  let liveList = await findDocs(Live, filter, pageSize, page)
  const total = await countDocs(Live, filter)
  if(liveList) {
    const instructorIds = [
      ...new Set(liveList.map((v) => v.instructorId.toString())),
    ];
    const instructors = await findAll(
      User,
      {
        _id: { $in: instructorIds },
      },
      "username _id role roleCode"
    );
    liveList = liveList.map((v) => {
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
        liveList,
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