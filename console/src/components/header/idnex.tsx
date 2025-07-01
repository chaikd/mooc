import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Layout } from "antd";

const { Header } = Layout;

export default function LayoutHeader({collapsed, setCollapsed, headerStyle, colorBgContainer}) {
  return (
    <Header className='flex justify-between items-center !pr-4' style={{ padding: 0, background: colorBgContainer }}>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={headerStyle}
      />
      <Avatar size={58} icon={<UserOutlined />} />
    </Header>
  )
}