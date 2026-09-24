# CLAUDE.md — @mooc/ai-ui

本文件为 AI 助手提供本子项目的上下文。仓库整体背景见根目录 `CLAUDE.md`，此处只描述 ai-ui；两者冲突时以本文件为准（更近的约定优先）。

## 项目定位

- `@mooc/ai-ui` 是 MOOC 平台的共享 React 组件库，位于 pnpm monorepo 的 `packages/ai-ui`。
- **源码优先**：`package.json` 的 `main`/`module`/`types`/`exports` 全部指向 `./src/index.ts`，消费方（console: Vite，web: Next.js）直接编译 TS 源码，改组件无需构建、HMR 直通。
- `pnpm build` 产出 ESM + `.d.ts` 到 `dist/`，仅为将来独立发布预留；**日常开发不要让消费方指向 dist**。
- 技术栈：React 19（peer >= 18）、TypeScript strict、Vite 7、Tailwind CSS 4、Vitest 4。

## 目录结构

```
packages/ai-ui/
  src/
    index.ts               # 公共 barrel，唯一对外出口
    components/<Name>/     # 组件三件套（固定模板，PascalCase 目录）
      <Name>.tsx           #   typed props 的函数组件
      index.ts             #   re-export 组件与类型
      __tests__/<Name>.test.tsx
    styles/
      theme.css            # Tailwind v4 @theme 设计令牌（颜色/圆角/阴影）
      index.css            # playground 专用 Tailwind 入口（消费方勿引）
    utils/cx.ts            # 零依赖 class 合并工具
  playground/              # 轻量 Vite 预览应用（pnpm ai-ui:dev）
  vite.config.ts           # 双用途：dev 以 playground 为 root；build 走 lib 模式
  eslint.config.js         # flat config，与 console 保持一致
  vitest.setup.ts          # jest-dom 匹配器
```

## 新增组件标准步骤

1. 建 `src/components/<Name>/` 三件套：`<Name>.tsx` + `index.ts` + `__tests__/<Name>.test.tsx`（可参照 `Button` 复制）。
2. 在 `src/index.ts` 导出组件与其类型。
3. 样式只用 Tailwind 工具类 + `theme.css` 令牌类（如 `bg-primary-600`、`rounded-ui`、`shadow-ui`）；不硬编码色值、不新增 CSS 文件。
4. 补齐测试（至少覆盖渲染与交互）。
5. 在 `playground/src/App.tsx` 增加用法示例，确保预览可见。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm ai-ui:dev` | 启动 playground 开发服务器（HMR 直通 src） |
| `pnpm ai-ui:test` | 运行 Vitest（watch 用 `pnpm --filter @mooc/ai-ui test:watch`） |
| `pnpm ai-ui:build` | 构建 ESM + d.ts 到 dist/ |
| `pnpm ai-ui:lint` | ESLint（flat config） |

均等价于 `pnpm --filter @mooc/ai-ui <script>`。

## 约定与红线

- 不改 `exports` 指向（源码优先是团队惯例，与 `@mooc/db-shared` 一致）。
- 组件零运行时依赖：不引入 classnames/clsx/lodash 等 runtime deps；class 合并用 `src/utils/cx.ts`。
- react / react-dom 是 peerDependencies，不得移入 dependencies。
- 公共导出只经 `src/index.ts`；消费方不得深路径导入 `@mooc/ai-ui/src/...`。
- 每个组件必须有测试；每个公共组件必须出现在 playground。

## 消费方接入（当前状态：仅文档，尚未接入）

- console（Vite + Tailwind 4）：加依赖 `"@mooc/ai-ui": "workspace:^"`；在 `console/src/styles/tailwind.css` 追加 `@import '@mooc/ai-ui/styles/theme.css';` 与 `@source '../../../packages/ai-ui/src';`。
- web（Next.js 15 + Tailwind 4）：同样加依赖；`next.config.ts` 增加 `transpilePackages: ['@mooc/ai-ui']`；全局 CSS 追加同款 `@import` + `@source`。
- 完整说明见本目录 `README.md`。
