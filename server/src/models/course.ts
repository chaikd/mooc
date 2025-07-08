import { model, Schema } from "mongoose";

// 课程状态接口
export interface CursorStatusType {
  _id?: string;
  statusCode: string;      // 状态code
  statusName: string;      // 状态名称
  statusDesc?: string;     // 状态描述
  sort?: number;           // 排序
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户id
}

// 课程章节接口
export interface CursorChapterType {
  _id?: string;
  chapterName: string;     // 章节名称
  chapterDesc?: string;    // 章节描述
  parentChapterId?: string; // 父级章节Id
  courseId: string;        // 课程id
  materialIds: string[];   // 关联的资料id数组
  sort?: number;           // 排序
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户id
}

// 课程报名状态接口
export interface CursorEnrollmentStatusType {
  _id?: string;
  statusCode: string;      // 状态code
  statusName: string;      // 状态名称
  statusDesc?: string;     // 状态描述
  sort?: number;           // 排序
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户id
}

// 课程报名/选课接口
export interface CursorEnrollmentType {
  _id?: string;
  courseId: string;        // 课程id
  studentId: string;       // 学生id
  enrollmentStatusId: string; // 报名状态id
  enrollmentTime: Date;    // 报名时间
  startTime?: Date;        // 开始学习时间
  lastStudyTime?: Date;    // 最后学习时间
  progress?: number;       // 学习进度(0-100)
  score?: number;          // 课程成绩
  certificateUrl?: string; // 证书链接
  remark?: string;         // 备注
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户id
}

// 学习记录接口
export interface CursorStudyRecordType {
  _id?: string;
  enrollmentId: string;    // 报名记录id
  chapterId: string;       // 章节id
  studentId: string;       // 学生id
  studyTime: number;       // 学习时长(秒)
  progress: number;        // 章节进度(0-100)
  isCompleted: boolean;    // 是否完成
  studyDate: Date;         // 学习日期
  createTime: Date;        // 创建时间
}

// 课程数据接口
export interface CursorType {
  _id?: string;
  courseName: string;      // 课程名称
  instructorId: string;    // 讲师id
  courseDesc?: string;     // 课程描述
  courseCover?: string;    // 课程封面
  courseDuration?: number; // 课程时长（分钟）
  price?: number;          // 价格
  sort?: number;           // 排序
  statusId: string;        // 课程状态id
  statusCode: string;
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户id
}

// 课程状态模型
const CursorStatusSchema = new Schema<CursorStatusType>({
  statusCode: { type: String, required: true, unique: true },
  statusName: { type: String, required: true },
  statusDesc: { type: String },
  sort: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

// 课程章节模型
const CursorChapterSchema = new Schema<CursorChapterType>({
  chapterName: { type: String, required: true },
  chapterDesc: { type: String },
  parentChapterId: { type: String },
  courseId: { type: String, required: true },
  materialIds: [{ type: String }], // 资料id数组
  sort: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

// 课程数据模型
const CursorSchema = new Schema<CursorType>({
  courseName: { type: String, required: true },
  instructorId: { type: String, required: true },
  courseDesc: { type: String },
  courseCover: { type: String },
  courseDuration: { type: Number },
  price: { type: Number, default: 0 },
  sort: { type: Number, default: 0 },
  statusId: { type: String, required: true },
  statusCode: { type: String, required: true },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

// 课程报名状态模型
const CursorEnrollmentStatusSchema = new Schema<CursorEnrollmentStatusType>({
  statusCode: { type: String, required: true, unique: true },
  statusName: { type: String, required: true },
  statusDesc: { type: String },
  sort: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

// 课程报名/选课模型
const CursorEnrollmentSchema = new Schema<CursorEnrollmentType>({
  courseId: { type: String, required: true },
  studentId: { type: String, required: true },
  enrollmentStatusId: { type: String, required: true },
  enrollmentTime: { type: Date, default: Date.now },
  startTime: { type: Date },
  lastStudyTime: { type: Date },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  score: { type: Number, min: 0, max: 100 },
  certificateUrl: { type: String },
  remark: { type: String },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

// 学习记录模型
const CursorStudyRecordSchema = new Schema<CursorStudyRecordType>({
  enrollmentId: { type: String, required: true },
  chapterId: { type: String, required: true },
  studentId: { type: String, required: true },
  studyTime: { type: Number, default: 0 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  isCompleted: { type: Boolean, default: false },
  studyDate: { type: Date, default: Date.now },
  createTime: { type: Date, default: Date.now }
});

const CursorStatus = model<CursorStatusType>('cursorStatus', CursorStatusSchema);
const CursorChapter = model<CursorChapterType>('cursorChapter', CursorChapterSchema);
const Cursor = model<CursorType>('cursor', CursorSchema);
const CursorEnrollmentStatus = model<CursorEnrollmentStatusType>('cursorEnrollmentStatus', CursorEnrollmentStatusSchema);
const CursorEnrollment = model<CursorEnrollmentType>('cursorEnrollment', CursorEnrollmentSchema);
const CursorStudyRecord = model<CursorStudyRecordType>('cursorStudyRecord', CursorStudyRecordSchema);

export {
  CursorStatus,
  CursorChapter,
  Cursor,
  CursorEnrollmentStatus,
  CursorEnrollment,
  CursorStudyRecord
};