import '@ant-design/v5-patch-for-react-19';
import { ReactNode } from "react";
import { Metadata } from "next";
import "./global.scss";
import AntdConfig from "@/modules/antd-config";
import { Geist } from "next/font/google";

const mono = Geist({
  variable: "--font-geist-Titling",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mooc",
  description: "在线学习平台，丰富的学习资源，计算机课程，网络学习",
};

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <html lang="zh" className={`${mono.className}`}>
      <body className="min-h-screen">
        <AntdConfig>{children}</AntdConfig>
      </body>
    </html>
  );
}
