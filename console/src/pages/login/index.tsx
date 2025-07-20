import logo from '@/assets/images/logo.svg'
import './index.scss'
import { Button, message } from 'antd'
import { Link, useNavigate } from 'react-router'
import { loginServerAction } from '@/api/auth'
import useFormFinish from '@/utils/use-form-finish'
import LoginForm from '@/components/login-form'
import { useDispatch } from 'react-redux'
import { setStoreToken, setUserId } from '@/store/modules/user'

export type loginType = {password:string, username: string}
export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const loginFn = async (data: loginType) => {
    const res = await loginServerAction(data)
    if (res.success) {
      dispatch(setStoreToken(res.token))
      dispatch(setUserId(res.userId))
      message.success('登录成功')
      navigate('/')
    } else {
      message.warning(res.message)
    }
  }
  const {pendding, finishFn} = useFormFinish(loginFn)
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
        <LoginForm {...{
          btnText: '登录',
          finishFn: finishFn,
          pendding
        }}></LoginForm>
        <Button className='w-full' size="large">GitHub账号登录</Button>
        <div className="flex justify-between mt-10 text-xs">
          <span>忘记密码？</span>
          <Link to="/regist">注册账号</Link>
        </div>
      </div>
      <p className="text-xs mt-8">© 2024 智慧教育云平台 版权所有</p>
    </div>
  )
}