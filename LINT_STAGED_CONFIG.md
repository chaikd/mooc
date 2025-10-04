# Lint-Staged 配置说明

## 概述

本项目使用 `lint-staged` 来实现智能的代码检查，只对在 git 提交中修改的文件所属的子项目进行 lint 检查。

## 配置详情

在根目录的 `package.json` 中配置了 `lint-staged`：

```json
{
  "lint-staged": {
    "console/**/*.{ts,tsx,js,jsx}": [
      "pnpm --filter console lint"
    ],
    "server/**/*.{ts,tsx,js,jsx}": [
      "pnpm --filter server lint"
    ],
    "web/**/*.{ts,tsx,js,jsx}": [
      "pnpm --filter web lint"
    ],
    "packages/db-shared/**/*.{ts,tsx,js,jsx}": [
      "pnpm --filter @mooc/db-shared lint"
    ],
    "packages/live-service/**/*.{ts,tsx,js,jsx}": [
      "pnpm --filter @mooc/live-service lint"
    ],
    "*.{json,js,ts,md}": [
      "echo 'Root configuration files changed - consider running full lint check'"
    ]
  }
}
```

## 工作原理

1. **文件匹配**: `lint-staged` 会根据配置的 glob 模式匹配暂存的文件
2. **子项目识别**: 根据文件路径自动识别属于哪个子项目
3. **执行命令**: 对匹配的文件运行对应的 lint 命令
4. **并行执行**: 默认情况下，多个任务会并行执行以提高效率

## 支持的文件类型

- **TypeScript**: `.ts`, `.tsx`
- **JavaScript**: `.js`, `.jsx`
- **配置文件**: `.json`, `.md`

## 子项目映射

| 文件路径模式 | 对应项目 | 执行的命令 |
|-------------|---------|-----------|
| `console/**/*` | console | `pnpm --filter console lint` |
| `server/**/*` | server | `pnpm --filter server lint` |
| `web/**/*` | web | `pnpm --filter web lint` |
| `packages/db-shared/**/*` | @mooc/db-shared | `pnpm --filter @mooc/db-shared lint` |
| `packages/live-service/**/*` | @mooc/live-service | `pnpm --filter @mooc/live-service lint` |
| 根目录配置文件 | - | 提示信息 |

## 使用方法

### 自动使用（推荐）
配置已集成到 `.husky/pre-commit` 钩子中，每次 `git commit` 时会自动运行。

### 手动使用
```bash
# 检查当前暂存的文件
pnpm lint-staged

# 查看详细信息
pnpm lint-staged --verbose

# 查看调试信息
pnpm lint-staged --debug
```

## 高级配置选项

如果需要更精细的控制，可以在 `package.json` 中添加更多配置：

```json
{
  "lint-staged": {
    "console/**/*.{ts,tsx}": [
      "pnpm --filter console lint",
      "pnpm --filter console type-check"
    ],
    "server/**/*.ts": [
      "pnpm --filter server lint",
      "pnpm --filter server build"
    ]
  }
}
```

## 优势

1. **性能优化**: 只检查相关的子项目，大幅减少检查时间
2. **开发体验**: 避免因其他项目的 lint 错误阻止提交
3. **自动识别**: 无需手动指定要检查的项目
4. **并行执行**: 多个子项目可以并行检查
5. **灵活配置**: 支持复杂的文件匹配和执行命令

## 故障排除

### 常见问题

1. **命令执行失败**: 检查对应子项目的 lint 脚本是否存在
2. **文件不匹配**: 确认 glob 模式是否正确
3. **权限问题**: 确保有执行对应命令的权限

### 调试命令

```bash
# 查看匹配的文件
pnpm lint-staged --debug

# 查看详细输出
pnpm lint-staged --verbose

# 检查配置
pnpm lint-staged --config package.json
```

## 扩展配置

可以根据需要添加更多检查：

```json
{
  "lint-staged": {
    "**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{json,md}": [
      "prettier --write"
    ]
  }
}
```
