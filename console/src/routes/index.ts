import Login from "@/pages/login";
import { createBrowserRouter, type RouteObject } from "react-router";
import Layout from '@/pages/layouts'
import Dashboard from "@/pages/dashboard";
import { lazy, ReactNode } from "react";
import NotFound from "@/pages/not-found";

export type CustomeRouteObject = RouteObject & {
  meta?: {
    label?: string,
    icon?: ReactNode
  }
};

const Cursor = lazy(() => import("@/pages/cursor" as string))
const AddCursor = lazy(() => import("@/pages/cursor/add" as string))
const Regist = lazy(() => import("@/pages/regist" as string))

// 课程管理
let cursorRoute = [
  {
    path: 'cursor',
    Component: Cursor,
    meta: {
      label: '课程列表',
      icon: 'SnippetsOutlined'
    }
  },
  {
    path: 'cursor/add',
    Component: AddCursor
  },
  {
    path: 'cursor/edit/:id',
    Component: AddCursor
  },
]

let router = createBrowserRouter([
  {
    path: '',
    Component: Layout,
    children: [
      {
        index: true,
        Component: Dashboard,
        meta: {
          label: '首页',
          icon: 'FundProjectionScreenOutlined'
        }
      },
      ...cursorRoute,
      {
        path: 'person',
        Component: Dashboard,
        meta: {
          label: '人员管理',
          icon: 'UserOutlined'
        }
      },
      {
        path: 'live',
        Component: Dashboard,
        meta: {
          label: '直播管理',
          icon: 'VideoCameraOutlined'
        }
      },
      {
        path: 'role',
        Component: Dashboard,
        meta: {
          label: '角色管理',
          icon: 'ApartmentOutlined'
        }
      },
    ]
  },
  {
    path: 'login',
    Component: Login
  },
  {
    path: 'regist',
    Component: Regist
  },
  {
    path: '*',
    Component: NotFound
  }
] as CustomeRouteObject[]);

export default router