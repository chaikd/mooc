"use client";
import { Space, Button, Modal, Form, Input, message, type FormInstance } from "antd";
import { login, OPEN_LOGIN_EVENT } from "@/services/auth";
import FormItem from "antd/es/form/FormItem";
import { useEffect, useState } from "react";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import Password from "antd/es/input/Password";
import { Avatar, Dropdown } from "antd";
import { Spin } from "antd";
import { tryFn } from "@/utils/try";
import { responseType } from "@/services/request";
import { UserType } from "@mooc/db-shared";
import { useAuth } from "@/modules/auth/auth-context";

function HeadAvatar({ userInfo, outFn }: { userInfo: UserType; outFn: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const items = [
    {
      key: "out",
      label: "退出登陆",
    },
  ];
  const onClick = async ({ key }: { key: string }) => {
    if (key === "out") {
      setPending(true);
      await outFn();
      setPending(false);
    }
  };
  return (
    <>
      <Spin spinning={pending}>
        <Dropdown menu={{ items, onClick }} placement="bottom">
          <Avatar icon={<UserOutlined />}></Avatar>
        </Dropdown>
        <span className="ml-2">{userInfo?.username}</span>
      </Spin>
    </>
  );
}

function LoginForm({ loginForm, submit, pending }: { loginForm: FormInstance; submit: () => Promise<void>; pending: boolean }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const onFinish = async () => {
    submit();
  };
  return (
    <Form className="!mt-2" form={loginForm} onFinish={onFinish}>
      <FormItem
        name="username"
        initialValue="lisi"
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input placeholder="请输入用户名" prefix={<UserOutlined />}></Input>
      </FormItem>
      <FormItem
        name="password"
        initialValue="123456"
        rules={[
          { required: true, message: "请输入密码" },
          { min: 6, message: "最少6位" },
        ]}
      >
        <Password
          placeholder="请输入密码"
          prefix={<LockOutlined />}
          visibilityToggle={{
            visible: passwordVisible,
            onVisibleChange: setPasswordVisible,
          }}
        ></Password>
      </FormItem>
      <FormItem>
        <Button
          className="w-full"
          htmlType="submit"
          type="primary"
          disabled={pending}
          loading={pending}
        >
          登陆
        </Button>
      </FormItem>
    </Form>
  );
}

export default function HeadAuth() {
  const [loginForm] = Form.useForm();
  const [open, setOpen] = useState(0);
  const [pending, setPending] = useState(false);
  const {
    user: data,
    refresh,
    clearPendingHref,
    logout,
  } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const submit = async () => {
    setPending(true);
    const datas = loginForm.getFieldsValue();
    const res = await tryFn(() => login(datas)).catch(() => {
      setPending(false);
    })
    if ((res as responseType).success) {
      messageApi.success("登陆成功");
      setOpen(0);
      await refresh();
    }
    setPending(false);
  };
  const outFn = async () => {
    await logout();
    messageApi.success("退出登陆");
  };

  useEffect(() => {
    const openLogin = () => setOpen(1)
    window.addEventListener(OPEN_LOGIN_EVENT, openLogin)
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, openLogin)
  }, [])

  return (
    <>
      {contextHolder}
      {(data && (
        <HeadAvatar
          {...{
            userInfo: data,
            outFn,
          }}
        ></HeadAvatar>
      )) || (
        <Space>
          <Spin spinning={pending}>
            <Button type="primary" onClick={() => setOpen(1)}>
              登录
            </Button>
          </Spin>
        </Space>
      )}
      <Modal
        open={open !== 0}
        footer={null}
        closeIcon={null}
        title={open === 1 ? "登陆" : "注册"}
        onCancel={() => {
          setOpen(0);
          clearPendingHref();
          loginForm.resetFields();
        }}
      >
        <div className="p-4">
          <LoginForm
            {...{
              loginForm,
              submit,
              pending,
            }}
          ></LoginForm>
        </div>
      </Modal>
    </>
  );
}
