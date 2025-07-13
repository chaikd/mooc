import { useSelector } from "react-redux"
import router from "@/routes";
import { icons } from "@/routes/icons";

export function parseRouters(prePath: string, permissions: string[]) {
  let routerConfigs = router.routes[0].children
  if (!Array.isArray(routerConfigs)) {
    routerConfigs = []
  }
  return _parseRouters(routerConfigs, prePath, permissions)
}

export function _parseRouters(routers: any[], prePath = '', permissions: any) {
  return routers.filter((route: any) => {
    return isMenuRoute(route, permissions)
  }).reduce((pre: { key: string; path: string; label: any; icon: any; children: undefined; }[], cur: { index: any; path: any; meta: { label: any; icon: any; }; children: any[]; }) => {
    const path = cur.index ? prePath + '/' : `${prePath}/${cur.path}`
    const obj = {
      key: path,
      path,
      label: cur.meta.label,
      icon: cur.meta.icon,
      children: undefined
    }
    const children = cur.children
    if(children && children.length > 0) {
      let children = cur.children.filter((route: any) => isMenuRoute(route,permissions))
      if(children.length == 0) {
        children = undefined as any
      }
    }
    obj.children = children && _parseRouters(children, path, permissions)
    pre.push(obj)
    return pre
  }, [])
}

function isMenuRoute(route: { meta: { label: any; permissions: any; }; }, permissions: any) {
  if (!route.meta?.label) return false
  const menuPermission = route?.meta?.permissions;
  const isPass = menuPermission 
    ? menuPermission.every(isPassPermissionCbFn(permissions))
    : true
  return isPass
}

function isPassPermissionCbFn(permissions: string | string[]) {
  return (permi: any) => (permissions?.includes(permi) || permissions?.includes(`0-${permi}`))
}

export function isPassUrl(id: string, permissions: string[] = []) {
  const routers = router.routes
  const routeConfig = _findRouteConfig(routers, id)
  return !routeConfig?.meta?.permissions || routeConfig?.meta?.permissions?.every(isPassPermissionCbFn(permissions))
}

function _findRouteConfig(routes: any[], id: string) {
  const routeConfig = routes.find((v: { id: any; }) => id.startsWith(v.id))
  if(routeConfig.id !== id) {
    return _findRouteConfig(routeConfig.children, id)
  } else {
    return routeConfig
  }
}

export function getMenus() {
  const menus = useSelector((state: any) => state.menus.menus)
  const switchIcon = (data: any[]) => {
    return data.map((v: { icon: string | number; }) => {
      return {
        ...v,
        icon: icons[String(v.icon) as keyof typeof icons]
      }
    })
  }
  return switchIcon(menus)
}