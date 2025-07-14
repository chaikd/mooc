import { Tag } from "antd";

export default function CourseStatus({status = {statusName: '', statusCode: ''}}: {status: {
  statusName: string;
  statusCode: string;
}}) {
  const color = status.statusCode === '2' ? 'green' : status.statusCode === '3' ? 'blue' : 'gray'
  return <Tag color={color}>{status.statusName}</Tag>
}