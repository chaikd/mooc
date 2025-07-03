import { Empty } from "antd";
import { Link } from "react-router";

export default function NotFound() {
  return(
    <>
      <Empty className="mt-30" description="暂无数据">
        <Link to="/">回到首页</Link>
      </Empty>
    </>
  )
}