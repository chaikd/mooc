import { logoutServerAction } from "@/api/auth";
import { getUserInfo } from "@/api/user";
import { setUserInfo } from "@/store/modules/user";
import { setToken } from "@/utils/token";
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Layout } from "antd";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

const { Header } = Layout;

export default function LayoutHeader({collapsed, setCollapsed, headerStyle, colorBgContainer}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const fn = async () => {
    const userInfo = await getUserInfo()
    console.log(userInfo)
    dispatch(setUserInfo(userInfo))
  }
  const logout = async () => {
    const res = await logoutServerAction()
    if(res.success) {
      setToken('')
      navigate('login')
    }
  }
  let dropdownItems = [
    {
      key: 'userCenter',
      label: '个人中心'
    },
    {
      key: 'logout',
      label: '退出登录',
      onClick: logout
    },
  ]
  
  useEffect(() => {
    fn()
  }, [dispatch])
  return (
    <Header className='flex justify-between items-center !pr-4' style={{ padding: 0, background: colorBgContainer }}>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={headerStyle}
      />
      <Dropdown menu={{ items: dropdownItems }} placement="bottom" arrow>
        <Avatar size={58} icon={<UserOutlined />} />
      </Dropdown>
    </Header>
  )
}