import { CustomeRouteObject } from "@/routes"
import { useSelector } from "react-redux"
import {
  FundProjectionScreenOutlined,
  SnippetsOutlined,
  ApartmentOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import router from "@/routes";

export const icons = {
  'FundProjectionScreenOutlined': FundProjectionScreenOutlined,
  'SnippetsOutlined': SnippetsOutlined,
  'ApartmentOutlined': ApartmentOutlined,
  'UserOutlined': UserOutlined,
  'VideoCameraOutlined': VideoCameraOutlined
}


export function parseRouters(prePath, permissions) {
  let routerConfigs = router.routes[0].children
  return _parseRouters(routerConfigs, prePath, permissions)
}

export function _parseRouters(routers, prePath = '', permissions) {
  let menus = routers.filter((v: CustomeRouteObject) => {
    const isPass = isPermissionPass(v, permissions)
    return !!v.meta?.label && isPass
  }).map((v: CustomeRouteObject) => {
    let path = v.index ? '/' : `/${v.path}`
    path = prePath + path
    let obj = {
      key: path,
      path,
      label: v.meta.label,
      icon: v.meta.icon,
      children: undefined
    }
    if (v.children) {
      let children = v.children.filter(child => {
        const isChildPass = isPermissionPass(child, permissions)
        return isChildPass
      })
      obj.children = _parseRouters(children, path, permissions)
    }
    if (!obj.children || obj.children.length === 0) {
      Reflect.deleteProperty(obj, 'children')
    }
    return obj
  })
  return menus
}

export function isPassUrl(id: string, permissions: string[] = []) {
  const routers = router.routes
  const routeConfig = _findRouteConfig(routers, id)
  return !routeConfig?.meta?.permissions || routeConfig?.meta?.permissions?.every(isSamePermissionCbFn(permissions))
}

function isSamePermissionCbFn(permissions) {
  return (permi) => (permissions?.includes(permi) || permissions?.includes(`0-${permi}`))
}

function _findRouteConfig(routes, id) {
  const routeConfig = routes.find(v => id.startsWith(v.id))
  if(routeConfig.id !== id) {
    return _findRouteConfig(routeConfig.children, id)
  } else {
    return routeConfig
  }
}

function isPermissionPass(routerConfig, permissions) {
  const menuPermission = routerConfig?.meta?.permissions;
  const isPass = menuPermission 
    ? menuPermission.every(isSamePermissionCbFn(permissions))
    : true
  return isPass
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