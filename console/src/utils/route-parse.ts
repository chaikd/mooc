import { CustomeRouteObject } from "@/routes"
import { useSelector } from "react-redux"
import {
  FundProjectionScreenOutlined,
  SnippetsOutlined,
  ApartmentOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

export const icons = {
  'FundProjectionScreenOutlined': FundProjectionScreenOutlined,
  'SnippetsOutlined': SnippetsOutlined,
  'ApartmentOutlined': ApartmentOutlined,
  'UserOutlined': UserOutlined,
  'VideoCameraOutlined': VideoCameraOutlined
}

export function parseRouters(routers) {
  let menus = routers.filter(v => !!v.meta?.label).map((v: CustomeRouteObject) => {
    let path = v.index ? '/' : `/${v.path}`
    let obj = {
      key: path,
      path,
      label: v.meta.label,
      icon: v.meta.icon,
      children: undefined
    }
    if (v.children) {
      obj.children = parseRouters(v.children)
    }
    if (!obj.children || obj.children.length === 0) {
      Reflect.deleteProperty(obj, 'children')
    }
    return obj
  })
  return menus
}

export function getMenus() {
  let menus = useSelector((state: any) => state.menus.menus)
  const switchIcon = (data) => {
    return data.map(v => {
      return {
        ...v,
        icon: icons[v.icon]
      }
    })
  }
  return switchIcon(menus)
}