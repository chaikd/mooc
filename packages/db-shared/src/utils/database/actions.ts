import type { Model } from "mongoose"

// 通用增删改查操作函数
export const createDoc = async <T>(model: Model<T>, data: Partial<T>) => {
  data = {
    ...data,
    createTime: new Date()
  }
  return await model.create(data)
}

export const findOneDoc = async <T>(model: Model<T>, filter: Partial<T>, select?: string) => {
  let query = model.findOne(filter)
  if (select) {
    query = query.select(select)
  }
  return await query.exec()
}

export const findDocs = async <T>(model: Model<T>, filter: Partial<T> = {}, limit = 10, page = 0, select?: string) => {
  page = Math.max(Number(page) - 1, 0)
  const skip = page * limit
  let query = model.find(filter).limit(limit).skip(skip)
  if (select) {
    query = query.select(select)
  }
  return await query.exec()
}

export const findAll = async <T>(model: Model<T>, filter: Partial<T> = {}, select?: string) => {
  const datas = await model.find(filter, select)
  return datas
}

export const updateDoc = async <T>(model: Model<T>, id: string, data: Partial<T>) => {
  return await model.findByIdAndUpdate(id, data, { new: true })
}

export const deleteDoc = async <T>(model: Model<T>, id: string) => {
  return await model.findByIdAndDelete(id)
}

export const countDocs = async <T>(model: Model<T>, filter: Partial<T> = {}) => {
  return await model.countDocuments(filter)
}