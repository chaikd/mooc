import { useSelector } from "react-redux"
import router, { CustomeRouteObject } from "@/routes";
import { icons } from "@/routes/icons";
import { MenuItemType } from "antd/es/menu/interface";
import { menuType, StoreType } from "@/store";

export function parseRouters(prePath: string, permissions: string[]) {
  let routerConfigs = router.routes[0].children
  if (!Array.isArray(routerConfigs)) {
    routerConfigs = []
  }
  return _parseRouters(routerConfigs, prePath, permissions)
}

export function _parseRouters<T extends MenuItemType & Partial<{path?: string, children?: T[]}>>(routers: CustomeRouteObject[], prePath = '', permissions: string | string[]): T[] {
  return routers.filter((route: CustomeRouteObject) => {
    return isMenuRoute(route, permissions)
  }).reduce((pre: CustomeRouteObject[], cur: CustomeRouteObject) => {
    const path = cur.index ? prePath + '/' : `${prePath}/${cur.path}`
    const obj = {
      key: path,
      path,
      label: cur.meta?.label,
      icon: cur.meta?.icon,
      children: undefined
    } as T
    const children = cur.children
    if(children && children.length > 0) {
      let children = cur.children?.filter((route) => isMenuRoute(route,permissions))
      if(children?.length == 0) {
        children = undefined
      }
    }
    obj.children = children && _parseRouters(children, path, permissions)
    pre.push(obj)
    return pre
  }, []) as T[]
}

function isMenuRoute(route: CustomeRouteObject, permissions: string | string[]) {
  if (!route.meta?.label) return false
  const menuPermission = route?.meta?.permissions;
  const isPass = menuPermission 
    ? menuPermission.every(isPassPermissionCbFn(permissions))
    : true
  return isPass
}

function isPassPermissionCbFn(permissions: string | string[]) {
  return (permi: string) => (permissions?.includes(permi) || permissions?.includes(`0-${permi}`))
}

export function isPassUrl(id: string, permissions: string[] = []) {
  const routers = router.routes
  const routeConfig = _findRouteConfig(routers, id)
  return !routeConfig?.meta?.permissions || routeConfig?.meta?.permissions?.every(isPassPermissionCbFn(permissions))
}

function _findRouteConfig(routes: CustomeRouteObject[], id: string) {
  if (!Array.isArray(routes)) return
  const routeConfig = routes?.find((v) => id.startsWith(v.id as string)) as CustomeRouteObject
  if(!routeConfig) return
  if(routeConfig?.id !== id) {
    return _findRouteConfig(routeConfig?.children as CustomeRouteObject[], id)
  } else {
    return routeConfig
  }
}

export function getMenus() {
  const menus = useSelector((state: StoreType) => state.menus.menus)
  const switchIcon = (data: menuType[]) => {
    return data.map((v: menuType) => {
      return {
        ...v,
        icon: icons[String(v.icon) as keyof typeof icons]
      }
    })
  }
  return switchIcon(menus)
}