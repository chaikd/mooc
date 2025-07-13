import { Table, Image } from "antd"
import CursorStatus from "@/pages/course/components/cursor-status"
import CourseActions from "@/pages/course/components/course-actions"
import { getTablePaginationConfig } from "@/utils/pagination-config"
import { CursorListItemType, CursorType } from "@/api/course"

export default function CursorList({list}: {list: CursorListItemType[]}) {
  const columns = [
    {
      title: '课程封面',
      dataIndex: 'courseCover',
      key: 'courseCover',
      width: 120,
      fixed: true,
      render: (courseCover: string, record: CursorListItemType) => (
        <Image
          width={80}
          height={60}
          src={courseCover}
          alt={record.courseName}
          style={{ objectFit: 'cover', borderRadius: '4px' }}
        />
      )
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
      fixed: true,
      width: 200,
    },
    {
      title: '讲师',
      dataIndex: 'instructorName',
      key: 'instructorName',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, val: CursorListItemType) => <CursorStatus status={val.statusInfo} />
    },
    {
      title: '报名人数',
      dataIndex: 'enrollment',
      key: 'enrollment',
      width: 120,
      render: (enrollment: string) => `${enrollment || 100}名学员`
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: string, record: CursorListItemType) => <CourseActions status={record.statusInfo} course={record}/>
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={list}
      rowKey="course_id"
      pagination={getTablePaginationConfig(list ? list.length : 0, 10, 1, () => {})}
      scroll={{ x: 1200 }}
    />
  )
}
