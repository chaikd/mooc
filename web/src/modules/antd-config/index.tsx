'use client'
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { App, ConfigProvider } from "antd"
import { ReactNode, useState } from "react"

export default function AntdConfig({ children }: {
  readonly children: ReactNode
}) {
  const [antdPrimary] = useState('6366F1')
  return (
    <ConfigProvider theme={
      {
        token: {
          colorPrimary: antdPrimary
        }
      }
    }>
      <App>
        <AntdRegistry>
          {children}
        </AntdRegistry>
      </App>
    </ConfigProvider>
  )
}