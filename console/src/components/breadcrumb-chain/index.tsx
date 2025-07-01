import { Breadcrumb } from "antd"
import { useSelector } from "react-redux"
import { useMatches } from "react-router"

export default function BreadcrumbChain() {
  const match = useMatches()
  const menus = useSelector((state: any) => state.menus.menus)
  let bread = match.filter(v => v.pathname !== '/').map(v => {
    let pathName = v.pathname
    let title = menus.find(val => val.key === pathName)?.label
    return {
      title
    }
  })
  return (
    <>
      <Breadcrumb items={bread}></Breadcrumb>
    </>
  )
}