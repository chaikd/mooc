import logo from '@/assets/images/logo.svg'
import './index.scss'
import { Input, Form, Button } from 'antd'

export default function Login() {
  return (
    <div className="login-box mx-auto h-screen w-screen flex flex-col items-center justify-center">
      <div className="logo">
        <img src={logo} alt="logo" />
      </div>
      <div className="name mt-2 text-center">
        <h2 className="text-2xl bg-linear-to-bl from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">智慧教育平台</h2>
        <p className="text-xs mt-2">专业的在线教育管理平台</p>
      </div>
      <div className="formbox shadow shadow-2xl p-6 rounded-lg w-1/3 mt-8">
        <Form>
          <Form.Item>
            <Input placeholder="请输入用户名" size="large"></Input>
          </Form.Item>
          <Form.Item>
            <Input placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button className='w-full' size="large" type="primary" htmlType="submit">登录</Button>
          </Form.Item>
        </Form>
        <Button className='w-full' size="large">GitHub账号登录</Button>
        <div className="flex justify-between mt-10 text-xs">
          <span>忘记密码？</span>
          <span>注册账号</span>
        </div>
      </div>
      <p className="text-xs mt-8">© 2024 智慧教育云平台 版权所有</p>
    </div>
  )
}