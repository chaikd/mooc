# @mooc/ai-ui

MOOC 平台共享 React 组件库：**源码优先、Tailwind CSS 4、React 19**。console（Vite）与 web（Next.js）直接消费 `src` 源码，无需构建；`dist/` 仅为将来独立发布预留。

## 快速开始

```bash
pnpm install          # 仓库根目录
pnpm ai-ui:dev        # 启动 playground 预览（终端打印本地地址）
pnpm ai-ui:test       # 运行测试
pnpm ai-ui:lint       # ESLint
pnpm ai-ui:build      # 构建 dist/（ESM + d.ts，发布预留）
```

## 开发流程

1. `pnpm ai-ui:dev` 启动 playground。
2. 在 `src/components/<Name>/` 按三件套模板新建组件（参照 `Button`）：
   - `<Name>.tsx` — typed props 的函数组件
   - `index.ts` — re-export 组件与类型
   - `__tests__/<Name>.test.tsx` — Vitest + Testing Library 测试
3. 在 `src/index.ts` 导出组件与类型（唯一公共出口）。
4. 在 `playground/src/App.tsx` 添加示例，改动即时热更新。
5. 跑 `pnpm ai-ui:test` 确认通过。

## 样式约定

- 组件只使用 Tailwind 工具类与 `src/styles/theme.css` 的 `@theme` 令牌类（`bg-primary-*`、`rounded-ui`、`shadow-ui`），不硬编码色值。
- 库本身不产出编译后的组件 CSS：消费方在自己的 Tailwind 构建里扫描 ai-ui 源码生成工具类（见下方接入）。

## 消费方接入

ai-ui 源码优先（`exports` → `src/index.ts`），消费方需要两步：安装 workspace 依赖 + 让自己的 Tailwind 扫描 ai-ui 源码。

### console（Vite）

1. `console/package.json` 添加依赖：`"@mooc/ai-ui": "workspace:^"`，然后 `pnpm install`。
2. `console/src/styles/tailwind.css` 追加：

```css
@import '@mooc/ai-ui/styles/theme.css';
@source '../../../packages/ai-ui/src';
```

### web（Next.js）

1. `web/package.json` 添加依赖：`"@mooc/ai-ui": "workspace:^"`，然后 `pnpm install`。
2. `web/next.config.ts` 增加 `transpilePackages: ['@mooc/ai-ui']`（Next 编译 TS 源码必需）。
3. 全局 CSS 追加与 console 相同的 `@import '@mooc/ai-ui/styles/theme.css';` 与 `@source`（路径按 web 相对位置调整）。

## 构建产物

`pnpm ai-ui:build` 输出 `dist/index.js`（ESM，`react`/`react-dom`/`react/jsx-runtime` 已 external）与 `.d.ts`。monorepo 内消费始终走源码，不依赖该产物。
