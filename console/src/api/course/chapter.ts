import { InformationType } from "../information";
import request from "../request";

// 课程章节数据类型
export interface CourseChapterType {
  _id?: string;
  chapterName: string;     // 章节名称
  chapterDesc?: string;    // 章节描述
  parentChapterId?: string; // 父级章节Id
  courseId: string;        // 课程id
  materialIds: string[];   // 关联的资料id数组
  sort?: number;           // 排序
  createTime?: Date;       // 创建时间
  createUserId?: string;   // 创建用户id
}

// 章节树形结构类型
export interface ChapterTreeNodeType extends CourseChapterType {
  children?: ChapterTreeNodeType[];
  level?: number;
  isLeaf?: boolean;
  materials?: InformationType[]
}

// 章节列表查询参数
export interface ChapterListParams {
  courseId: string;
  parentChapterId?: string;
}

// 章节创建参数
export interface ChapterCreateParams {
  chapterName: string;
  chapterDesc?: string;
  parentChapterId?: string;
  courseId: string;
  materialIds?: string[];
  sort?: number;
}

// 章节更新参数
export interface ChapterUpdateParams extends ChapterCreateParams {
  _id: string;
}

// 获取课程章节树
export function getChapterTree(courseId: string): Promise<{
  success: boolean;
  data: ChapterTreeNodeType[];
}> {
  return request.get(`/api/course/chapter/tree/${courseId}`);
}

// 获取章节详情
export function getChapterDetail(id: string): Promise<{
  success: boolean;
  data: CourseChapterType;
}> {
  return request.get(`/api/course/chapter/${id}`);
}

// 创建章节
export function createChapter(data: ChapterCreateParams): Promise<{
  success: boolean;
  data: CourseChapterType;
  message: string;
}> {
  return request.post('/api/course/chapter/add', data);
}

// 更新章节
export function updateChapter(data: ChapterUpdateParams): Promise<{
  success: boolean;
  data: CourseChapterType;
  message: string;
}> {
  return request.post('/api/course/chapter/edit', data);
}

// 删除章节
export function deleteChapter(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return request.delete('/api/course/chapter/delete', { data: { _id: id } });
}

export async function getParseChapterTree(courseId: string): Promise<{
  trees: Array<CourseChapterType>
  keys: Array<string>
}> {
  const {data} = await getChapterTree(courseId)
  const roots = data.filter(v => !v.parentChapterId)
  const keys: Array<string> = []
  const findChildren = (dataList: Array<CourseChapterType>, roots: Array<CourseChapterType>) => {
    return roots.map(v => {
      if(v._id) {
        keys.push(v._id)
      }
      let children = dataList.filter(item => item.parentChapterId === v._id).sort((a,b) => ((a.sort as number) - (b.sort as number)))
      children = findChildren(dataList, children)
      return {
        ...v,
        title: v.chapterName,
        key: v._id,
        children: children?.length > 0 ? children : undefined
      }
    })
  }
  const trees = findChildren(data, roots)
  return {
    trees,
    keys
  }
}