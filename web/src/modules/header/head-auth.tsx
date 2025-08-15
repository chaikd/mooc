"use client";
import { Space, Button, Modal, Form, Input, message } from "antd";
import { getUserInfo, login } from "@/services/auth";
import FormItem from "antd/es/form/FormItem";
import { useEffect, useState } from "react";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import Password from "antd/es/input/Password";
import { logOut } from "@/services/auth";
import { Avatar, Dropdown } from "antd";
import { Spin } from "antd";
import { redirect, usePathname } from "next/navigation";
import { tryFn } from "@/utils/try";
import { responseType } from "@/services/request";

function HeadAvatar({ userInfo, outFn }) {
  const [pending, setPending] = useState(false);
  const items = [
    {
      key: "out",
      label: "退出登陆",
    },
  ];
  const onClick = async ({ key }) => {
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

function LoginForm({ loginForm, submit, pending }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const onFinish = async () => {
    submit();
  };
  return (
    <Form className="!mt-2" form={loginForm} onFinish={onFinish}>
      <FormItem
        name="username"
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input placeholder="请输入用户名" prefix={<UserOutlined />}></Input>
      </FormItem>
      <FormItem
        name="password"
        rules={[
          { required: true, message: "请输入密码" },
          { min: 6, message: "最少6位地黄丸" },
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
  const [data, setData] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const pathname = usePathname()
  // const { data } = useSWR<{ success: boolean; data: object }>(
  //   '/api/auth/user',
  //   request.get
  // )
  const getUser = async () => {
    setPending(true);
    const res = await getUserInfo();
    setData(res);
    setPending(false);
  };
  const submit = async () => {
    setPending(true);
    const datas = loginForm.getFieldsValue();
    const res = await tryFn(() => login(datas)).catch(() => {
      setPending(false);
    })
    if ((res as responseType).success) {
      messageApi.success("登陆成功");
      setOpen(0);
      await getUser();
      redirect(pathname)
    }
    setPending(false);
  };
  const outFn = async () => {
    const res = await logOut();
    if (res.success) {
      messageApi.success("退出登陆");
      await getUser();
      redirect(pathname)
    }
  };
  useEffect(() => {
    getUser();
  }, []);
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
