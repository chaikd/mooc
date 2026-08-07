# CLAUDE.md

## 项目概述

这是一个 MOOC（大规模开放在线课程）平台，monorepo 架构，使用 pnpm workspace 管理 5 个包。

- **管理端 (console)**: https://console.mooc.chaikd.com
- **学员端 (web)**: https://web.mooc.chaikd.com
- **移动端 (web)**: https://m.mooc.chaikd.com
- 还有微信小程序（体验版）

**技术栈**: TypeScript, React 19, Next.js 15, Express 5, MongoDB/Mongoose, Redis, mediasoup (WebRTC SFU), Socket.IO

**运行时**: Node.js v20.18.3, pnpm@10.7.1

**模块系统**: 全项目 ESM（`"type": "module"`）

## 包结构

```
mooc/
  console/             # 管理端 - Vite + React 19 + Ant Design 5
  server/              # 后端服务 - Express 5 + WebSocket + mediasoup
  web/                 # 学员端 - Next.js 15 App Router
  packages/
    db-shared/         # @mooc/db-shared - 共享数据库层
    live-service/      # @mooc/live-service - 共享直播服务
```

### 包间依赖关系

```
console ──────────> @mooc/live-service
server ───────────> @mooc/db-shared
web ──────────────> @mooc/db-shared + @mooc/live-service
```

### 各包详情

#### console — 管理端
- **框架**: Vite 7 + React 19
- **入口**: `console/src/main.jsx`
- **路由**: react-router v7，Redux Toolkit 状态管理
- **UI**: Ant Design 5 + Tailwind CSS 4
- **路由结构**:
  - `/login` — 登录
  - `/regist` — 注册
  - `/` (Layout) — 主布局，子路由:
    - `/course` — 课程管理（list, add, edit/:id, chapters/:id）
    - `/person` — 人员管理（user, role, permission）
    - `/live` — 直播管理（list, :id）
    - `/system` — 系统设置（course-status）
- **开发**: `pnpm console:dev`（Vite 开发服务器，代理 `/api` → `localhost:3004`）
- **构建**: `pnpm console:build`（Vite build，未压缩）
- **环境变量**: `SOCKETIO_HOST`（`.env.development` / `.env.production`）

#### server — 后端服务
- **框架**: Express 5
- **入口**: `server/src/server.ts`（创建 HTTP 服务器 → 连接 DB → 启动 WebSocket）
- **端口**: 3004（开发）
- **开发**: `pnpm server:dev`（tsx watch）
- **构建**: `pnpm server:build`（Vite build，保留模块，输出 ESM）
- **中间件链**（`app.ts`）:
  1. `express.json()`, `cookieParser()`
  2. CORS（所有来源）
  3. 白名单检查（`/api/auth/regist`, `/api/auth/login`, `/hls` 跳过认证）
  4. `authenticateToken`（JWT RS256，从 cookie 读取）
  5. `checkPromssion`（硬编码 URL 权限检查）
  6. 静态文件：`/hls` → `tmp/hls/`
  7. 路由注册
  8. 404 处理
  9. `errorHandler`
- **API 路由**:
  - `/api/auth` — 认证（login, regist, logout）
  - `/api/user` — 用户管理 CRUD
  - `/api/role` — 角色管理 CRUD
  - `/api/permission` — 权限管理 CRUD
  - `/api/course` — 课程管理（含章节、状态子路由）
  - `/api/qiniu` — 七牛云上传 token
  - `/api/information` — 资料管理 CRUD
  - `/api/live` — 直播管理 CRUD
- **服务模块**:
  - `servers/websocket/` — Socket.IO 服务器（`/ws/live` 命名空间 + 聊天）
  - `servers/mediasoup/` — Mediasoup SFU（WebRTC 媒体服务器）
  - `servers/ffmpeg/` — FFmpeg 集成（HLS 转码）
- **环境变量**: `PORT`, `WEBRTC_TRANSPORT_IP`, `MONGO_URI`, 七牛云密钥（`QINNIU_ASSESSKEY`, `QINNIU_SECRETKEY`, `QINIU_URL`）

#### web — 学员端
- **框架**: Next.js 15.5.9（App Router）
- **入口**: Next.js 自动路由
- **开发**: `pnpm web:dev`（`PORT=3001 next dev`）
- **构建**: `pnpm web:build`
- **启动**: `next start --port 3008`
- **路由结构**:
  - `(content-page)/` — 桌面端布局
    - `/home` — 首页
    - `/course/[id]` — 课程详情
    - `/course/center` — 我的课程
    - `/live/[id]` — 直播间
    - `/live/center` — 直播中心
  - `(mobile-page)/` — 移动端布局
    - `/m-live/[id]` — 移动直播间
  - `api/` — Next.js API 路由（auth, course, live）
- **配置**: 关闭 React StrictMode，远程图片域名 picsum.photos
- **中间件**: `middleware.ts` 匹配 `/api/auth/user` 和 `/api/auth/logout`，设置 CORS + JWT 验证
- **模块**: `modules/` 目录下按功能组织（antd-config, banner, course, course-card, footer, header, home, live）
- **环境变量**: `NEXT_PUBLIC_API_HOST`, `NEXT_PUBLIC_SOCKETIO_HOST`, `NEXT_PUBLIC_MONGO_URI`, JWT 密钥路径

#### @mooc/db-shared — 共享数据库层
- **依赖**: mongoose 8, redis 5, winston 3
- **导出**:
  - `connectDB` — MongoDB 连接（使用 `MONGO_URI` 或 `NEXT_PUBLIC_MONGO_URI`）
  - `redisRequest` — Redis 客户端（单例，基于 hash 的操作）
  - Mongoose 模型: User, Role, Permission, Course, CourseChapter, CourseStatus, CourseEnrollment, CourseEnrollmentStatus, CourseStudyRecord, Information, InformationType, Live
  - `mdaction` — 数据库操作辅助函数
  - Winston logger

#### @mooc/live-service — 共享直播服务
- **依赖**: mediasoup-client, socket.io-client
- **导出**:
  - `useMediaStream` — React Hook，管理 3 个 MediaStream（remote, mic, camera）
  - `useMediasoup` — React Hook，管理 mediasoup transports/producers/consumers
  - `useSocketIo` — React Hook，Socket.IO 连接（`/ws/live` 命名空间）
  - 辅助函数: `getRouterRtpCapabilities`, `getReport`, `getProduces`, `getConsumer`, `requestWs`

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm console:dev` | 启动管理端开发服务器 |
| `pnpm server:dev` | 启动后端开发服务器 |
| `pnpm web:dev` | 启动学员端开发服务器 |
| `pnpm build` | 并行构建所有三个应用 |
| `pnpm lint` | 顺序 lint 所有 5 个包 |
| `pnpm --filter <pkg> <cmd>` | 在指定包中运行命令 |

## 代码规范

### 路径别名
- 每个包中 `@/*` 映射到 `src/*`
- `server` 额外有 `@mooc/db-shared/*` 和 `@mooc/live-service/*` 别名

### TypeScript
- ⚠️ **当前状态**: 各包配置不一致，`web` 使用 `strict: false`
- 代码中使用 `.ts` 扩展名导入（`import { ... } from './foo.ts'`）
- 共享包（db-shared, live-service）直接以 TypeScript 源码被消费，无构建步骤

### 命名约定
- 组件文件使用 kebab-case（如 `lazy-image/`, `course-card/`）
- 组件目录使用 `index.tsx` 作为入口
- 中文注释和文档

### Git 提交
- 使用 `feat:`, `fix:` 等前缀（尚未强制 conventional commit）
- Husky pre-commit 钩子运行 lint-staged（仅 lint 变更文件所在子项目）

## 关键架构模式

1. **认证**: JWT RS256 非对称密钥，PEM 文件存储，通过 `authorization` cookie 传递
2. **直播**: Mediasoup SFU 架构，WebRTC 信令通过 Socket.IO `/ws/live` 命名空间
3. **文件存储**: 七牛云（QiNiu），服务端生成上传 token，客户端直传
4. **权限系统**: 基于角色的权限（菜单/按钮/API 三级），当前服务端使用硬编码 URL 检查
5. **双前端**: 管理端 SPA + 学员端 SSR，学员端通过 `(content-page)` 和 `(mobile-page)` 路由组区分桌面/移动端
6. **前后端 API 双通道**: 后端有 Express REST API，web 也有 Next.js API 路由（部分直接调用 Mongoose，绕过服务端）

## 已知问题

1. **TypeScript 不一致**: `web` 包 `strict: false`，target 从 es2016 到 es2024 各不相同
2. **零测试**: 无任何测试框架或测试文件
3. **无 CI/CD**: 无自动化流水线
4. **PEM 私钥**: 在 git 仓库中被跟踪（安全问题）
5. **ESLint 不一致**: `web` 同时有 `.eslintrc.json` 和 `eslint.config.mjs`
6. **权限检查**: 硬编码 URL 列表，非完整 RBAC
7. **无 API 文档**: 无 Swagger/OpenAPI
8. **无数据库迁移**: Mongoose 模型直接操作，无迁移策略