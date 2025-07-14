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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemFn = (v: any) => ({
    ...v,
    icon: v.icon ? <v.icon /> : undefined
  })
  return (
    <Menu
      className='flex-1'
      theme="light"
      mode="inline"
      defaultSelectedKeys={[defaultSelectedKey]}
      items={menus.map(itemFn)}
      onClick={menuChange}
    />
  )
}