import { ReactNode } from "react";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Metadata } from "next";
import './global.scss'

export const metaData:Metadata = {
  title: 'create next app'
}

export default function RootLayout({ children }: {
  readonly children: ReactNode
}) {
  return (
    <html lang="zh">
      <body
      >
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}