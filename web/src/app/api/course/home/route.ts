import { connectDB, Course, Live, LiveType, User } from "@mooc/db-shared";
import { findAll, findDocs } from "@mooc/db-shared/src/utils/database/actions";
import { Model } from "mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB()
  const now = new Date()
  let responseInfo = {}
  try {
    let lives = await findDocs(Live, {
      startTime: { $lte: now },
      endTime: { $gte: now }
    }, 3, 1)
    if (lives.length < 3) {
      const moreLives = await (Live as Model<LiveType>).find(
        { startTime: { $gt: now } }
      )
      .sort({ startTime: 1 })
      .limit(3 - lives.length);
      lives = lives.concat(moreLives);
    }
    let courses = await findDocs(Course, {}, 4, 1)
    const instructorIds = [...new Set(lives.concat(courses).map(v => v.instructorId.toString()))]
    const instructors = await findAll(User, {
      _id: {$in: instructorIds}
    }, 'username _id role roleCode')
    lives = lives.map(v => {
      const obj = {
        ...v.toObject()
      }
      return {
        ...obj,
        instructor: instructors.find(item => item._id.toString() === obj.instructorId.toString())
      }
    })
    courses = courses.map(v => {
      const obj = {
        ...v.toObject()
      }
      return {
        ...obj,
        instructor: instructors.find(item => item._id.toString() === obj.instructorId.toString())
      }
    })
    responseInfo = {
      success: true,
      data: {
        lives,
        courses
      }
    }
  } catch (error) {
    responseInfo = {
      success: false,
      error
    }
  }
  return NextResponse.json(responseInfo)
}