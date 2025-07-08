import { Breadcrumb } from "antd"
import { useMatches } from "react-router"
import router from "@/routes"
import _ from 'lodash'

function flatMapDeepFn(data, propName: string) {
  let arr = data
  while (arr.some(v => v?.[propName] && v?.[propName].length)) {
    arr = _.flatMapDeep(arr, (val) => {
      let datas = val?.[propName]
      if(val?.[propName]) {
        Reflect.deleteProperty(val, propName)
      }
      return [val, datas]
    })
  }
  return arr.filter(v => !!v)
}

export default function BreadcrumbChain({breads = undefined}) {
  const match = useMatches()
  const routers = flatMapDeepFn(_.cloneDeep(router.routes), 'children')
  let bread = breads ? breads : match.filter(v => v.pathname !== '/').map(v => {
    let title = routers.find(val => val.id === v.id)?.meta?.label
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