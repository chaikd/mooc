import router from "@/routes";
import { setMenus } from "@/store/modules/menus";
import { getMenus, parseRouters } from "@/utils/route-parse";
import { Menu } from "antd";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useMatches, useNavigate } from "react-router";

export default function Menus() {
  const dispatch = useDispatch()
  const navigateTo = useNavigate()
  const match = useMatches()
  useEffect(() => {
    let routes = router.routes[0]
    let menu = parseRouters(routes.children)
    dispatch(setMenus(menu))
  }, [dispatch])
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