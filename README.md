# gu-mcp

`gu-mcp` 是一个基于 Node.js 与 TypeScript 的 MCP stdio 服务脚手架。

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
pnpm run dev
pnpm run build
pnpm run start
pnpm run typecheck
pnpm run verify
pnpm run mcp:inspect
```

## 环境变量

配置从 `.env` 读取，并在 `src/config/env.ts` 中完成校验与默认值填充。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MCP_SERVER_NAME` | `gu-mcp` | MCP 服务名称。 |
| `MCP_SERVER_VERSION` | `0.1.0` | MCP 服务版本。 |
| `MCP_SERVER_DESCRIPTION` | `基础 Node TypeScript MCP 服务，包含加法演示。` | 服务描述，会作为 MCP instructions 使用。 |
| `MCP_LOG_LEVEL` | `info` | 写入 stderr 的最小日志等级。 |

## MCP 客户端配置

构建完成后，可以让 MCP 客户端执行打包产物：

```json
{
  "mcpServers": {
    "gu-mcp": {
      "command": "node",
      "args": ["dist/index.mjs"],
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
