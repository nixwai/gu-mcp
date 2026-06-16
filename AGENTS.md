# AGENTS.md

## 项目概览

`gu-mcp` 是一个基于 Node.js 与 TypeScript 的 MCP 服务，支持 stdio 与 Streamable HTTP 两种启动模式。项目保持轻量，但目录结构要便于继续扩展工具、资源、传输入口与配置。

## 文件结构

- `src/entry/stdio.ts`：stdio 模式入口，只负责加载环境变量、连接 `StdioServerTransport` 与处理致命错误。
- `src/entry/http.ts`：HTTP 模式入口，只负责加载环境变量、创建 Node HTTP server、监听端口与注册关闭处理。
- `src/server/create-server.ts`：创建 MCP 服务并集中注册工具与资源，必须保持传输无关。
- `src/server/http-handler.ts`：HTTP 请求分发、Streamable HTTP session 初始化与请求复用逻辑。
- `src/server/http-shutdown.ts`：HTTP 模式的进程信号处理与 session 关闭逻辑。
- `src/config/`：环境变量读取、默认值填充与校验。
- `src/tools/`：MCP 工具注册。
- `src/resources/`：MCP 资源注册。
- `src/typings/`：可复用类型定义，跨模块使用的 `type` / `interface` 优先放在这里。
- `src/utils/`：可复用的通用工具函数。

## 开发命令

- `pnpm install`：安装依赖并刷新 `pnpm-lock.yaml`。
- `pnpm run dev:stdio`：直接运行 stdio TypeScript 入口。
- `pnpm run dev:http`：直接运行 HTTP TypeScript 入口。
- `pnpm run build`：使用 `tsdown` 打包到 `dist/`。
- `pnpm run start:stdio`：运行打包后的 stdio MCP 服务。
- `pnpm run start:http`：运行打包后的 HTTP MCP 服务。
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

## MCP HTTP 规则

- HTTP 模式使用 `StreamableHTTPServerTransport` 与 Node 内置 `http`，不要引入 Express。
- HTTP 默认监听 `127.0.0.1:3000/mcp`，相关配置来自 `MCP_HTTP_HOST`、`MCP_HTTP_PORT` 与 `MCP_HTTP_PATH`。
- HTTP session map 只允许存在于 HTTP 模式相关文件中，不要放进 `create-server.ts`。
- 初始化请求创建 transport，后续请求必须通过 `mcp-session-id` 复用已有 transport。
- `POST`、`GET`、`DELETE` 由 `src/server/http-handler.ts` 维护，进程关闭逻辑由 `src/server/http-shutdown.ts` 维护。

## 打包规则

- `pnpm run build` 只需要输出 `dist/stdio.js` 与 `dist/http.js`，不要生成声明文件或 sourcemap。
- 可执行 shebang 由 `tsdown.config.ts` 的 `banner: '#!/usr/bin/env node'` 添加。
- 不要在源码入口中手写 shebang，避免入口源码与打包配置重复。

## 注释规则

- 新增函数、导出类型、核心常量与关键局部变量时，需要补充简短中文注释。
- 注释用于说明职责和边界，不要重复代码字面含义。
- Markdown 文档统一使用中文。

## 类型规则

- 跨模块复用的 `type` / `interface` 放在 `src/typings/`，并使用 `import type` 引入。
- `src/server/` 中的运行时模块不要同时承担可复用类型聚合职责。
- 仅当前文件内部使用的局部类型可以保留在当前文件中。

## 扩展规则

- 新增工具放在 `src/tools/`，并从 `src/server/create-server.ts` 注册。
- 新增资源放在 `src/resources/`，并从 `src/server/create-server.ts` 注册。
- 新增 MCP 传输入口放在 `src/entry/`，传输请求处理或生命周期逻辑放在 `src/server/` 的独立文件中。
- 能复用的业务逻辑优先放进 `src/utils/`，让 MCP 注册文件保持轻薄。
- 完成变更前至少运行 `pnpm run typecheck` 与 `pnpm run build`。
