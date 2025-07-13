import { Breadcrumb } from "antd"
import { RouteObject, useMatches } from "react-router"
import router from "@/routes"
import _ from 'lodash'

function flatMapDeepFn<T extends RouteObject & { [key: string]: any }>(data: T[], propName: string) {
  let arr = data
  while (arr.some(v => v?.[propName] && v?.[propName].length)) {
    arr = _.flatMapDeep(arr, (val) => {
      const datas = val?.[propName]
      if(val?.[propName]) {
        Reflect.deleteProperty(val, propName)
      }
      return [val, datas]
    })
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
    const route: any = routers.find(val => val.id === v.id)
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