import BreadcrumbChain from "@/components/breadcrumb-chain"
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons"
import { Button, Input, PaginationProps, Radio } from "antd"
import { createContext, useEffect, useState } from "react"
import CourseTile from "../components/tile"
import CourseList from "../components/list"
import { Link } from "react-router"
import { CourseListItemType, getCourseList } from "@/api/course"

export const CourseContext = createContext({})

export interface ListDataType  {
  size: number,
  total: number,
  page: number,
  data: CourseListItemType[]
}

export default function Course() {
  const [style, setStyle] = useState('tile')
  const [list, setList] = useState<ListDataType>({
    data: [],
    total: 0,
    size: 9,
    page: 1
  })
  const fetchList = async (paginationInfo?: PaginationProps) => {
    const pageInfo = paginationInfo ? paginationInfo : {
      current: 1,
      pageSize: 9,
      total: 0
    }
    const res = await getCourseList({
      page: pageInfo.current,
      size: pageInfo.pageSize
    })
    setList(res.data)
  }

  useEffect(() => {
    fetchList()
  }, [])
  return (
    <div className="flex flex-col h-full">
      <div className="head flex justify-between">
        <BreadcrumbChain></BreadcrumbChain>
        <Link to="/course/add">
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
        <CourseContext.Provider value={{fetchList}}>
          {style === 'tile' ? (
            <CourseTile list={list} fetchList={fetchList}></CourseTile>
          ) : (
            <CourseList list={list} fetchList={fetchList}></CourseList>
          )}
        </CourseContext.Provider>
      </div>
    </div>
  )
}