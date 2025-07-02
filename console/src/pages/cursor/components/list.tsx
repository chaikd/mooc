import { Table, Image } from "antd"
import CursorStatus from "@/components/cursor-status"
import CourseActions from "@/components/course-actions"
import { getTablePaginationConfig } from "@/utils/pagination-config"

export default function CursorList({list}) {
  const columns = [
    {
      title: '课程封面',
      dataIndex: 'cover_image',
      key: 'cover_image',
      width: 120,
      render: (cover_image, record) => (
        <Image
          width={80}
          height={60}
          src={cover_image}
          alt={record.course_name}
          style={{ objectFit: 'cover', borderRadius: '4px' }}
        />
      )
    },
    {
      title: '课程名称',
      dataIndex: 'course_name',
      key: 'course_name',
      width: 200,
    },
    {
      title: '讲师',
      dataIndex: 'instructor',
      key: 'instructor',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => <CursorStatus status={status} />
    },
    {
      title: '报名人数',
      dataIndex: 'enrollment',
      key: 'enrollment',
      width: 120,
      render: (enrollment) => `${enrollment}名学员`
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => <CourseActions status={record.status} />
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
