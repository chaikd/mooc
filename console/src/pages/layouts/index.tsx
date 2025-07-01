import React, { useState } from 'react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, theme } from 'antd';
import { Outlet } from 'react-router';
import Menus from '@/components/menus'
import LayoutHeader from '@/components/header/idnex';

const { Sider, Content } = Layout;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const headerStyle = {
    fontSize: '16px',
    width: 64,
    height: 64,
  }
  const contentStyle = {
    margin: '24px 16px',
    padding: 24,
    minHeight: 280,
    background: colorBgContainer,
    borderRadius: borderRadiusLG,
  }

  return (
    <Layout className='h-screen'>
      <Sider className="h-full" trigger={null} theme="light" collapsible collapsed={collapsed}>
        <div className="sider-box h-full flex flex-col">
        <div className="flex items-center justify-center !w-full text-white font-semibold bg-[#4F46E5]" style={headerStyle}>
          <span>管理平台</span>
          </div>
          <Menus></Menus>
        </div>
      </Sider>
      <Layout>
        <LayoutHeader {...{colorBgContainer,setCollapsed, collapsed, headerStyle}}></LayoutHeader>
        <Content
          style={contentStyle}
        >
          <Outlet></Outlet>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;