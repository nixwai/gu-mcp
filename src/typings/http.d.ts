import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// HttpSession 表示 HTTP 模式下一个 MCP session 绑定的服务与传输。
export interface HttpSession {
  // server 保存当前 HTTP 会话绑定的 MCP 服务实例。
  server: McpServer;
  // transport 保存当前 HTTP 会话绑定的 Streamable HTTP 传输。
  transport: StreamableHTTPServerTransport;
}
