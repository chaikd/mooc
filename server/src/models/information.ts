import { model, Schema } from "mongoose";

// 资料类型接口
export interface InformationTypeType {
  _id?: string;
  typeCode: string;        // 类型code
  typeName: string;        // 类型名称
  fileType: string;        // 文件类型
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户
}

// 资料管理接口
export interface InformationType {
  _id?: string;
  name: string;            // 资料名称
  type?: string;            // 资料类型
  fileUrl: string;         // 资料关联地址
  fileSize?: number;       // 文件大小
  fileExtension?: string;  // 文件扩展名
  createTime: Date;        // 创建时间
  createUserId: string;    // 创建用户
}

// 资料类型模型
const InformationTypeSchema = new Schema<InformationTypeType>({
  typeCode: { type: String, required: true, unique: true },
  typeName: { type: String, required: true },
  fileType: { type: String, required: true },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

// 资料管理模型
const InformationSchema = new Schema<InformationType>({
  name: { type: String, required: true },
  type: { type: String },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number },
  fileExtension: { type: String },
  createTime: { type: Date, default: Date.now },
  createUserId: { type: String, required: true }
});

const InformationType = model<InformationTypeType>('informationType', InformationTypeSchema);
const Information = model<InformationType>('information', InformationSchema);

export {
  InformationType,
  Information
};
