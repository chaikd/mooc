import { useSelector } from "react-redux"
import router from "@/routes";
import { icons } from "@/routes/icons";

export function parseRouters(prePath, permissions) {
  let routerConfigs = router.routes[0].children
  return _parseRouters(routerConfigs, prePath, permissions)
}

export function _parseRouters(routers, prePath = '', permissions) {
  return routers.filter(route => {
    return isMenuRoute(route, permissions)
  }).reduce((pre, cur) => {
    let path = cur.index ? prePath + '/' : `${prePath}/${cur.path}`
    let obj = {
      key: path,
      path,
      label: cur.meta.label,
      icon: cur.meta.icon,
      children: undefined
    }
    let children = cur.children
    if(children && children.length > 0) {
      let children = cur.children.filter(route => isMenuRoute(route,permissions))
      if(children.length == 0) {
        children = undefined
      }
    }
    obj.children = children && _parseRouters(children, path, permissions)
    pre.push(obj)
    return pre
  }, [])
}

function isMenuRoute(route, permissions) {
  if (!route.meta?.label) return false
  const menuPermission = route?.meta?.permissions;
  const isPass = menuPermission 
    ? menuPermission.every(isPassPermissionCbFn(permissions))
    : true
  return isPass
}

function isPassPermissionCbFn(permissions) {
  return (permi) => (permissions?.includes(permi) || permissions?.includes(`0-${permi}`))
}

export function isPassUrl(id: string, permissions: string[] = []) {
  const routers = router.routes
  const routeConfig = _findRouteConfig(routers, id)
  return !routeConfig?.meta?.permissions || routeConfig?.meta?.permissions?.every(isPassPermissionCbFn(permissions))
}

function _findRouteConfig(routes, id) {
  const routeConfig = routes.find(v => id.startsWith(v.id))
  if(routeConfig.id !== id) {
    return _findRouteConfig(routeConfig.children, id)
  } else {
    return routeConfig
  }
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