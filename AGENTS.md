# AGENTS.md

## 项目概览

`gu-mcp` 是一个基于 Node.js 与 TypeScript 的 MCP stdio 服务。项目保持轻量，但目录结构要便于继续扩展工具、资源与配置。

## 文件结构

- `src/index.ts`：进程入口，负责加载环境变量、连接 stdio 传输与处理致命错误。
- `src/server/`：创建 MCP 服务并集中注册功能。
- `src/config/`：环境变量读取、默认值填充与校验。
- `src/tools/`：MCP 工具注册。
- `src/resources/`：MCP 资源注册。
- `src/utils/`：可复用的通用工具函数。

## 开发命令

- `pnpm install`：安装依赖并刷新 `pnpm-lock.yaml`。
- `pnpm run dev`：直接运行 TypeScript 入口。
- `pnpm run build`：使用 `tsdown` 打包到 `dist/`。
- `pnpm run start`：运行打包后的 MCP 服务。
- `pnpm run typecheck`：执行 TypeScript 类型检查。
- `pnpm run verify`：依次执行类型检查与构建。
- `pnpm run mcp:inspect`：构建后打开 MCP Inspector。

## 环境变量规则

- 提交 `.env.example`，不要提交 `.env` 或特定环境的密钥文件。
- 新增环境变量时，必须同步更新 `src/config/env.ts` 与 `.env.example`。
- 本地开发默认值应尽量安全、可预测。
- 不要在源码、文档或示例中硬编码密钥。

## MCP stdio 规则

- 普通日志不得写入 stdout，stdout 只保留给 MCP JSON-RPC 协议帧。
- 项目日志统一使用 `src/utils/logger.ts`，它只写入 stderr。
- 启动阶段副作用要保持少量且可预测。
- `dotenv` 必须静默加载，避免依赖库默认日志污染 stdout。

## 打包规则

- `pnpm run build` 只需要输出 `dist/index.mjs`，不要生成声明文件或 sourcemap。
- 可执行 shebang 由 `tsdown.config.ts` 的 `banner: '#!/usr/bin/env node'` 添加。
- 不要在 `src/index.ts` 中手写 shebang，避免入口源码与打包配置重复。

## 注释规则

- 新增函数、导出类型、核心常量与关键局部变量时，需要补充简短中文注释。
- 注释用于说明职责和边界，不要重复代码字面含义。
- Markdown 文档统一使用中文。

## 扩展规则

- 新增工具放在 `src/tools/`，并从 `src/server/create-server.ts` 注册。
- 新增资源放在 `src/resources/`，并从 `src/server/create-server.ts` 注册。
- 能复用的业务逻辑优先放进 `src/utils/`，让 MCP 注册文件保持轻薄。
- 完成变更前至少运行 `pnpm run typecheck` 与 `pnpm run build`。
