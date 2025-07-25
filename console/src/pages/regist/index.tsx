import { registServerAction } from '@/api/auth'
import logo from '@/assets/images/logo.svg'
import LoginForm from '@/components/login-form'
import useFormFinish from '@/utils/use-form-finish'

export default function Login() {
  const {pendding, finishFn} = useFormFinish(registServerAction)
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
          btnText: '注册账号',
          finishFn: finishFn,
          pendding,
        }}></LoginForm>
      </div>
      <p className="text-xs mt-8">© 2024 智慧教育云平台 版权所有</p>
    </div>
  )
}