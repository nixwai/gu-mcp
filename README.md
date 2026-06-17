# gu-mcp

`gu-mcp` 是一个基于 Node.js 与 TypeScript 的 MCP 服务脚手架，支持 stdio 与 Streamable HTTP 两种启动模式。

当前服务提供：

- `add` 工具：接收两个数字并返回加法结果。
- `info://server` 资源：以 JSON 返回服务基础信息。

## 运行要求

- Node.js `>=22.18.0`
- pnpm `>=11`

## 初始化

```bash
pnpm install
cp .env.example .env
```

## 常用脚本

```bash
pnpm run dev:stdio
pnpm run dev:http
pnpm run build
pnpm run start:stdio
pnpm run start:http
pnpm run typecheck
pnpm run verify
pnpm run mcp:inspect
```

`pnpm run dev` 与 `pnpm run start` 默认等同于 stdio 模式。

## 环境变量

配置从 `.env` 读取，并在 `src/config/env.ts` 中完成校验与默认值填充。

| 变量 | 说明 |
| --- | --- |
| `MCP_SERVER_NAME` | MCP 服务名称。 |
| `MCP_SERVER_VERSION` | MCP 服务版本。 |
| `MCP_SERVER_DESCRIPTION` | 服务描述，会作为 MCP instructions 使用。 |
| `MCP_LOG_LEVEL` | 写入 stderr 的最小日志等级。 |
| `MCP_HTTP_HOST` | HTTP 模式监听地址。 |
| `MCP_HTTP_PORT` | HTTP 模式监听端口。 |
| `MCP_HTTP_PATH` | HTTP Streamable endpoint 路径。 |

## stdio 模式

stdio 模式适合本地 MCP 客户端。构建完成后，可以让 MCP 客户端执行打包产物：

```json
{
  "mcpServers": {
    "gu-mcp": {
      "command": "node",
      "args": ["dist/stdio.js"],
      "env": {
        "MCP_SERVER_NAME": "gu-mcp"
      }
    }
  }
}
```

本地调试可使用 MCP Inspector：

```bash
pnpm run mcp:inspect
```

## HTTP 模式

HTTP 模式使用 MCP Streamable HTTP 传输

启动开发模式：

```bash
pnpm run dev:http
```

构建后启动：

```bash
pnpm run build
pnpm run start:http
```

HTTP endpoint 支持 MCP Streamable HTTP 的 `POST`、`GET` 与 `DELETE` 流程。初始化请求会创建有状态 session，并通过 `mcp-session-id` 响应头返回会话标识；后续请求需要携带同名请求头复用对应 transport。项目不提供旧版 HTTP+SSE 兼容端点。
