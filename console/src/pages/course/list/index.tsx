import BreadcrumbChain from "@/components/breadcrumb-chain"
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons"
import { Button, Form, Input, Radio } from "antd"
import { createContext, memo, useEffect, useState } from "react"
import CourseTile from "../components/tile"
import CourseList from "../components/list"
import { Link } from "react-router"
import { CourseListItemType, getCourseList } from "@/api/course"
import Promission from "@/components/promission"

export const CourseContext = createContext({})

export interface ListDataType  {
  size: number,
  total: number,
  page: number,
  data: CourseListItemType[]
}

export default memo(function Course() {
  const [style, setStyle] = useState('tile')
  const [filter, setFilter] = useState({})
  const [list, setList] = useState<ListDataType>({
    data: [],
    total: 0,
    size: 9,
    page: 1
  })
  const [pagination, setPagination] = useState({
    total: 0,
    pageSize: 9,
    current: 1
  })
  const fetchList = async (paginationInfo?: {current: number, pageSize: number}) => {
    const pageInfo = paginationInfo ? paginationInfo : {
      current: list.page,
      pageSize: list.size,
    }
    const res = await getCourseList({
      ...filter,
      page: pageInfo.current,
      size: pageInfo.pageSize
    })
    setPagination({
      total: res.data.total,
      pageSize: res.data.size,
      current: res.data.page,
    })
    setList(res.data)
  }
  const search = (val: {courseName: string}) => {
    setFilter(val)
  }

  useEffect(() => {
    fetchList(pagination)
  }, [filter])
  return (
    <div className="flex flex-col h-full">
      <div className="head flex justify-between">
        <BreadcrumbChain></BreadcrumbChain>
        <Promission authToken="AddCourse">
          <Link to="/course/add">
            <Button>新建课程</Button>
          </Link>
        </Promission>
      </div>
      <div className="action flex justify-between mt-4">
        <Form onFinish={search} layout="inline">
          <Form.Item name="courseName">
            <Input placeholder="搜索课程"></Input>
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit">搜索</Button>
          </Form.Item>
        </Form>
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
})