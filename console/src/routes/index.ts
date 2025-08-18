import Layout from '@/pages/layouts';
import Login from "@/pages/login";
import { createBrowserRouter, type RouteObject } from "react-router";
// import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { lazy, ReactNode } from "react";

export type CustomeRouteObject = RouteObject & {
  meta?: {
    label?: string,
    icon?: ReactNode,
    permissions?: string[]
  }
};

// 课程
const Course = lazy(() => import("@/pages/course" as string))
const CourseList = lazy(() => import("@/pages/course/list" as string))
const AddCourse = lazy(() => import("@/pages/course/add" as string))
const CourseStatus = lazy(() => import("@/pages/course/status" as string))
const CourseChapter = lazy(() => import("@/pages/course/chapters" as string))
const Regist = lazy(() => import("@/pages/regist" as string))
const Person = lazy(() => import("@/pages/person" as string))
const User = lazy(() => import("@/pages/person/user/list" as string))
const Role = lazy(() => import("@/pages/person/role" as string))
const Permission = lazy(() => import("@/pages/person/permission" as string))
const System = lazy(() => import("@/pages/system" as string))
const Live = lazy(() => import("@/pages/live" as string))
const LiveList = lazy(() => import("@/pages/live/list" as string))
const LiveConsole = lazy(() => import("@/pages/live/console" as string))

// 课程管理
const cursorRoute = [
  {
    path: 'course',
    Component: Course,
    meta: {
      label: '课程管理',
      icon: 'AppstoreAddOutlined',
    },
    children: [
      {
        index: true,
        Component: CourseList,
        meta: {
          label: '课程列表',
        }
      },
      {
        path: 'add',
        Component: AddCourse
      },
      {
        path: 'edit/:id',
        Component: AddCourse
      },
      {
        path: 'chapters/:id',
        Component: CourseChapter,
      },
    ]
  },
]

const router = createBrowserRouter([
  {
    path: '',
    Component: Layout,
    children: [
      // {
      //   index: true,
      //   Component: Dashboard,
      //   meta: {
      //     label: '首页',
      //     icon: 'FundProjectionScreenOutlined'
      //   }
      // },
      ...cursorRoute,
      {
        path: 'person',
        Component: Person,
        meta: {
          label: '人员管理',
          icon: 'UserOutlined',
          permissions: ['PersonManage']
        },
        children: [
          {
            path: 'user',
            Component: User,
            meta: {
              label: '用户管理',
              permissions: ['UserManage']
            },
          },
          {
            path: 'role',
            Component: Role,
            meta: {
              label: '角色管理',
              permissions: ['RoleManage']
            },
            // lazy: async () => {
            //   const { default: RoleComponent } = await import('../pages/person/role/index.js')
            //   return { Component: RoleComponent }
            // }
          },
          {
            path: 'permission',
            Component: Permission,
            meta: {
              label: '权限管理',
              permissions: ['PermissionManage']
            }
          },
        ]
      },
      {
        path: 'live',
        Component: Live,
        meta: {
          label: '直播管理',
          icon: 'VideoCameraOutlined',
          permissions: ['LiveManage']
        },
        children: [
          {
            index: true,
            Component: LiveList,
            meta: {
              label: '直播列表',
            }
          },
          {
            path: ':id',
            Component: LiveConsole,
          },
        ]
      },
      {
        path: 'system',
        Component: System,
        meta: {
          label: '系统管理',
          icon: 'SettingOutlined',
          permissions: ['SystemManage']
        },
        children: [
          {
            path: 'course-status',
            Component: CourseStatus,
            meta: {
              label: '课程状态',
            }
          }
        ]
      }
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