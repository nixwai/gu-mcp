# gu-mcp

`gu-mcp` 是一个开源 MCP 服务，用于向 Agent 提供可发现、可读取、可安装的项目级 `skills`。

服务支持两种接入方式：

- `stdio`：适合本地 Agent 或 MCP 客户端直接启动。
- `Streamable HTTP`：适合通过 HTTP endpoint 接入的 Agent 或线上部署场景。

当前项目的核心能力是暴露根目录 `skills/` 中的可用 skill。Agent 可以通过 MCP 工具列出 skill、读取完整内容，并获取说明式安装步骤。项目内置 `prompt-enhancer` skill，用于将模糊提示词增强为清晰、可执行、低上下文的 Agent 提示词。

## 在 Agent 上安装 MCP

### 线上 Streamable HTTP

推荐直接在支持 MCP Streamable HTTP 的 Agent 中添加服务：

```text
服务名称：gu-mcp
请求地址：https://www.gujianruchu.cn/mcp
```

也可以直接让 Agent 执行类似指令：

```text
为当前 Agent 添加 MCP 服务：gu-mcp，请求地址为 https://www.gujianruchu.cn/mcp
```

### 本地 stdio

本地开发或本地 MCP 客户端可以使用 `stdio` 方式。先安装依赖并构建：

```bash
pnpm install
pnpm run build
```

然后在 MCP 客户端中配置打包后的入口：

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

### 本地 Streamable HTTP

本地 HTTP 调试可直接启动开发入口：

```bash
pnpm run dev:http
```

构建后启动：

```bash
pnpm run build
pnpm run start:http
```

默认 endpoint 为：

```text
http://127.0.0.1:3000/mcp
```

## 安装 Skill

Agent 接入 `gu-mcp` 后，可以通过以下 MCP 工具管理项目内的 skill：

| 工具 | 说明 |
| --- | --- |
| `list_skills` | 列出 `skills/` 目录中的可用 skill。 |
| `get_skill` | 读取指定 skill 的元数据、完整 `SKILL.md` 和附属文件内容。 |
| `install_skill` | 返回推荐安装目标、安装步骤和文件载荷。 |

`install_skill` 是说明式安装工具：它不会直接复制文件，也不会覆盖用户本地已有 skill。目标目录由调用方 Agent 或用户根据返回的说明决定。

Codex 全局 skill 通常建议安装到：

```text
~/.codex/skills/<skill-name>
```

Windows 环境通常是：

```text
%USERPROFILE%\.codex\skills\<skill-name>
```

例如安装当前内置的 `prompt-enhancer` 时，Agent 可以先调用 `install_skill` 获取文件载荷和安装步骤，再将文件写入对应的 `prompt-enhancer` 目录。安装完成后，通常需要重启或刷新 Agent，使新的 skill 被重新发现。

## 开发者说明

### 运行要求

- Node.js `>=22.18.0`
- pnpm `>=11`

### 常用命令

```bash
pnpm install
pnpm run dev:stdio
pnpm run dev:http
pnpm run build
pnpm run typecheck
pnpm run verify
pnpm run mcp:inspect
```

`pnpm run dev` 默认等同于 `pnpm run dev:stdio`。

### 配置与目录

- `.env.example`：本地环境变量示例，不包含密钥。
- `src/config/env.ts`：读取环境变量，填充默认值并校验配置。
- `src/server/create-server.ts`：创建传输无关的 MCP 服务，并集中注册工具与资源。
- `src/tools/`：注册 MCP 工具，例如 skill 列表、详情和安装说明。
- `src/resources/`：注册 MCP 资源，例如 `info://server` 服务基础信息。
- `skills/`：项目提供的 skill 目录，每个 skill 使用独立子目录维护。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `MCP_SERVER_NAME` | MCP 服务名称。 |
| `MCP_SERVER_VERSION` | MCP 服务版本。 |
| `MCP_SERVER_DESCRIPTION` | 服务描述，会作为 MCP instructions 使用。 |
| `MCP_LOG_LEVEL` | 写入 stderr 的最小日志等级。 |
| `MCP_HTTP_HOST` | HTTP 模式监听地址。 |
| `MCP_HTTP_PORT` | HTTP 模式监听端口。 |
| `MCP_HTTP_PATH` | HTTP Streamable endpoint 路径。 |

### HTTP 会话

HTTP 模式使用 MCP Streamable HTTP 传输。初始化请求会创建有状态 session，并通过 `mcp-session-id` 响应头返回会话标识；后续 `POST`、`GET`、`DELETE` 请求需要携带同名请求头复用对应 transport。项目不提供旧版 HTTP+SSE 兼容端点。
