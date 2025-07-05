import { getMenus } from "@/utils/route-parse";
import { Menu } from "antd";
import { useMatches, useNavigate } from "react-router";

export default function Menus() {
  const navigateTo = useNavigate()
  const match = useMatches()
  const menuChange = ({ key}) => {
    navigateTo(key)
  }
  const menus = getMenus()
  const defaultSelectedKey = match[match.length - 1].pathname
  return (
    <Menu
      className='flex-1'
      theme="light"
      mode="inline"
      defaultSelectedKeys={[defaultSelectedKey]}
      items={
        menus.map((v) => (
          {
            ...v,
            icon: v['icon'].render()
          }
        ))
      }
      onClick={menuChange}
    />
  )
}