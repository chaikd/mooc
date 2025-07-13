import { getMenus } from "@/utils/menu-parse";
import { Menu } from "antd";
import { useMatches, useNavigate } from "react-router";

export default function Menus() {
  const navigateTo = useNavigate()
  const match = useMatches()
  const menuChange = ({key}: {key: string}) => {
    navigateTo(key)
  }
  const menus = getMenus()
  const defaultSelectedKey = match[match.length - 1].pathname
  const itemFn = (v: any): any => ({
    ...v,
    icon: v['icon'].render()
  })
  return (
    <Menu
      className='flex-1'
      theme="light"
      mode="inline"
      defaultSelectedKeys={[defaultSelectedKey]}
      items={
        menus.map((v) => (
          itemFn(v)
        ))
      }
      onClick={menuChange}
    />
  )
}