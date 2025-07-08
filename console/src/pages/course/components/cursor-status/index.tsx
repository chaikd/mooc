import { Tag } from "antd";

export default function CursorStatus({status}) {
  let color = status.statusCode === '2' ? 'green' : status.statusCode === '3' ? 'blue' : 'gray'
  return <Tag color={color}>{status.statusName}</Tag>
}