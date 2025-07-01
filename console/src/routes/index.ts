import Login from "@/pages/login";
import { createBrowserRouter, type RouteObject } from "react-router";
import Layout from '@/pages/layouts'
import Dashboard from "@/pages/dashboard";
import { lazy, ReactNode } from "react";

export type CustomeRouteObject = RouteObject & {
  meta?: {
    label?: string,
    icon?: ReactNode
  }
};

const Cursor = lazy(() => import("@/pages/cursor" as string))

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
      {
        path: 'cursor',
        Component: Cursor,
        meta: {
          label: '课程列表',
          icon: 'SnippetsOutlined'
        },
        children: [
          {
            path: 'detail/:id',
            Component: Dashboard,
          }
        ]
      },
      {
        path: 'students',
        Component: Dashboard,
        meta: {
          label: '学员管理',
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
  }
] as CustomeRouteObject[]);

export default router