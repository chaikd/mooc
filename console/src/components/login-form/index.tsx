import { Button, Form, Input } from "antd";

type PropType = {
  finishFn: () => void
  pendding: boolean
  btnText?: string
}

export default function LoginForm({finishFn, pendding, btnText = '登陆'}: PropType) {
  return(
    <Form onFinish={finishFn}>
      <Form.Item name="username" rules={[
        {required: true, message: '请输入用户名'},
        {min: 3, message: '最少3位'}
      ]}>
        <Input placeholder="请输入用户名" size="large"></Input>
      </Form.Item>
      <Form.Item name="password" rules={[
        {required: true, message: '请输入密码'},
        {min: 6, message: '最少6位'}
      ]}>
        <Input.Password placeholder="请输入密码" size="large" />
      </Form.Item>
      <Form.Item>
        <Button className='w-full' type="primary" size="large" htmlType='submit' disabled={pendding} loading={pendding}>{btnText}</Button>
      </Form.Item>
    </Form>
  )
}