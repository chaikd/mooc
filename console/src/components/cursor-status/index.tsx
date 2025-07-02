import { Tag } from "antd";

export default function CursorStatus({status}) {
  let color = status === '已发布' ? 'green' : status === '已下架' ? 'blue' : 'gray'
  return <Tag color={color}>{status}</Tag>
}