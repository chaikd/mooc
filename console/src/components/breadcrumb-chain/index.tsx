import { Breadcrumb } from "antd"
import { useMatches } from "react-router"
import router, { CustomeRouteObject } from "@/routes"
import _ from 'lodash'

function flatMapDeepFn<T extends CustomeRouteObject, K extends keyof T>(data: T[], propName: K) {
  let arr = data
  while (arr.some(v => v?.[propName] && (v?.[propName] as Array<T>).length)) {
    arr = _.flatMapDeep(arr, (val) => {
      const datas = val?.[propName]
      if(val?.[propName]) {
        Reflect.deleteProperty(val, propName)
      }
      return [val, datas]
    }) as []
  }
  return arr.filter(v => !!v)
}

export default function BreadcrumbChain({breads = undefined}: {breads?: {
  title?: string;
  href?: string;
}[]}) {
  const match = useMatches()
  const routers = flatMapDeepFn(_.cloneDeep(router.routes), 'children')
  const bread = breads ? breads : match.filter(v => v.pathname !== '/').map(v => {
    const route = routers.find(val => val.id === v.id) as CustomeRouteObject
    const title = route?.meta?.label
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