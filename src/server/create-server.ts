import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerServerInfoResource } from '../resources/server-info.js';
import { registerSkillTools } from '../tools/skills.js';
import type { AppEnv } from '../typings/env.js';

/**
 * 创建 MCP 服务实例，并集中注册当前项目暴露的资源与工具。
 */
export function createServer(env: AppEnv): McpServer {
  // server 是对外提供 MCP 能力的核心服务对象。
  const server = new McpServer(
    {
      name: env.MCP_SERVER_NAME,
      version: env.MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        logging: {},
      },
      instructions: env.MCP_SERVER_DESCRIPTION,
    },
  );

  registerServerInfoResource(server, env);
  registerSkillTools(server);

  return server;
}
