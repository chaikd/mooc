'use client'
import { Space } from "antd";
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function HeaderMenu() {
  const pathName = usePathname()
  const menus = [
    {
      label: '课程中心',
      href: '/course/center'
    },
    {
      label: '直播',
      href: '/live/center'
    }
  ]
  return (
    <div className="ml-4">
      <Space>
        {
          menus.map((v) => {
            return (<Link href={v.href} key={v.href}>
                <span className={classNames('text-black hover:text-primary',{
                  'text-primary': pathName === v.href
                })}>{v.label}</span>
              </Link>)
          })
        }
      </Space>
    </div>
  )
}