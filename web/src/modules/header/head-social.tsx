import { GithubFilled } from "@ant-design/icons"
import { Dropdown } from "antd"
import Link from "next/link"

export default function HeadSocial() {
  const socials = [
    {
      key: "github",
      // href: "https://github.com/chaikd",
      label: <Link href="https://github.com/chaikd" target="_blank" rel="noopener noreferrer">
        <GithubFilled className="text-sm font-[600] text-black-500" />
      </Link>
    },
  ]
  return (
    <Dropdown menu={{ items: socials }}>
      <span className="cursor-pointer hover:text-primary" onClick={(e) => e.preventDefault()}>
        关于我
      </span>
    </Dropdown>
  )
}