import { logoutServerAction } from "@/api/auth";
import { removeToken } from "@/utils/token";
import { removeUserInfo } from "@/utils/user-info";
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Layout } from "antd";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { setUserInfo } from "@/store/modules/user";

const { Header } = Layout;

export default function LayoutHeader({collapsed, setCollapsed, headerStyle, colorBgContainer}) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const logout = async () => {
    const res = await logoutServerAction()
    if(res.success) {
      removeToken()
      removeUserInfo()
      dispatch(setUserInfo({}))
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