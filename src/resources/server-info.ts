import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AppEnv } from '../config/env.js';

/**
 * 注册服务基础信息资源，供 MCP 客户端读取当前服务元数据。
 */
export function registerServerInfoResource(server: McpServer, env: AppEnv): void {
  server.registerResource(
    'server-info',
    'info://server',
    {
      description: 'Basic information about this MCP server.',
      mimeType: 'application/json',
      title: 'Server Info',
    },
    (uri) => ({
      contents: [
        {
          mimeType: 'application/json',
          // text 是资源主体，使用 JSON 字符串保持跨客户端兼容。
          text: JSON.stringify(
            {
              description: env.MCP_SERVER_DESCRIPTION,
              name: env.MCP_SERVER_NAME,
              transport: 'stdio',
              version: env.MCP_SERVER_VERSION,
            },
            null,
            2,
          ),
          uri: uri.href,
        },
      ],
    }),
  );
}
