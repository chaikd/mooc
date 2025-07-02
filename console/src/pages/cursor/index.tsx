import BreadcrumbChain from "@/components/breadcrumb-chain"
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons"
import { Button, Input, Radio } from "antd"
import { useState } from "react"
import CursorTile from "./components/tile"
import CursorList from "./components/list"
import { Link } from "react-router"

let list = [
  {
    "course_id": "C001",
    "course_name": "Python编程入门",
    "instructor": "张明",
    "status": "已发布",
    "create_time": "2025-05-10 14:30:22",
    "enrollment": 128,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "下架", "删除"]
  },
  {
    "course_id": "C002",
    "course_name": "Web前端开发实战",
    "instructor": "李思思",
    "status": "已发布",
    "create_time": "2025-04-22 09:15:33",
    "enrollment": 96,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "下架", "删除"]
  },
  {
    "course_id": "C003",
    "course_name": "数据分析与可视化",
    "instructor": "王建",
    "status": "草稿",
    "create_time": "2025-06-05 16:45:18",
    "enrollment": 0,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "发布", "删除"]
  },
  {
    "course_id": "C004",
    "course_name": "UI/UX设计基础",
    "instructor": "陈雅",
    "status": "已下架",
    "create_time": "2025-03-15 11:20:45",
    "enrollment": 64,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "发布", "删除"]
  },
  {
    "course_id": "C005",
    "course_name": "移动应用开发",
    "instructor": "赵志强",
    "status": "已发布",
    "create_time": "2025-05-28 13:40:10",
    "enrollment": 82,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "下架", "删除"]
  },
  {
    "course_id": "C006",
    "course_name": "云计算基础",
    "instructor": "刘云",
    "status": "草稿",
    "create_time": "2025-06-12 10:05:27",
    "enrollment": 0,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "发布", "删除"]
  },
  {
    "course_id": "C007",
    "course_name": "人工智能导论",
    "instructor": "吴智能",
    "status": "已发布",
    "create_time": "2025-04-05 15:22:39",
    "enrollment": 145,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "下架", "删除"]
  },
  {
    "course_id": "C008",
    "course_name": "数字营销策略",
    "instructor": "郑商务",
    "status": "已下架",
    "create_time": "2025-02-18 09:50:11",
    "enrollment": 37,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "发布", "删除"]
  },
  {
    "course_id": "C009",
    "course_name": "项目管理实战",
    "instructor": "周经理",
    "status": "已发布",
    "create_time": "2025-05-15 14:18:56",
    "enrollment": 73,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "下架", "删除"]
  },
  {
    "course_id": "C010",
    "course_name": "区块链技术入门",
    "instructor": "钱链",
    "status": "草稿",
    "create_time": "2025-06-08 11:33:42",
    "enrollment": 0,
    "cover_image": "https://picsum.photos/1920/1080?random",
    "actions": ["编辑", "发布", "删除"]
  }
]

export default function Cursor() {
  const [style, setStyle] = useState('tile')
  return (
    <div className="flex flex-col h-full">
      <div className="head flex justify-between">
        <BreadcrumbChain></BreadcrumbChain>
        <Link to="/cursor/add">
          <Button>新建课程</Button>
        </Link>
      </div>
      <div className="action flex justify-between mt-4">
        <div className="input">
          <Input placeholder="搜索课程"></Input>
        </div>
        <div className="btn">
          <Radio.Group value={style} onChange={(e) => setStyle(e.target.value)}>
            <Radio.Button value="tile">
              <AppstoreOutlined />
            </Radio.Button>
            <Radio.Button value="list">
              <BarsOutlined />
            </Radio.Button>
          </Radio.Group>
        </div>
      </div>
      <div className="mt-4 flex-1 h-0 overflow-y-auto">
        {style === 'tile' ? (
          <CursorTile list={list}></CursorTile>
        ) : (
          <CursorList list={list}></CursorList>
        )}
      </div>
    </div>
  )
}