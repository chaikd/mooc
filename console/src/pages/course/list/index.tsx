import BreadcrumbChain from "@/components/breadcrumb-chain"
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons"
import { Button, Input, Radio } from "antd"
import { createContext, useEffect, useState } from "react"
import CourseTile from "../components/tile"
import CourseList from "../components/list"
import { Link } from "react-router"
import { getCourseList } from "@/api/course"

export const CourseContext = createContext({})

export default function Course() {
  const [style, setStyle] = useState('tile')
  const [list, setList] = useState([])
  const fetchList = async () => {
    const res = await getCourseList({
      page: 1,
      size: 10
    })
    setList(res.data.data)
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
            <CourseTile list={list}></CourseTile>
          ) : (
            <CourseList list={list}></CourseList>
          )}
        </CourseContext.Provider>
      </div>
    </div>
  )
}