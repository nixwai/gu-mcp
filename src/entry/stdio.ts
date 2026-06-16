import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadEnv } from '../config/env.js';
import { createServer } from '../server/create-server.js';
import { createLogger } from '../utils/logger.js';

/**
 * 启动 stdio 模式：加载配置、创建 MCP 服务并连接标准输入输出传输。
 */
async function main(): Promise<void> {
  // env 保存当前进程读取并校验后的服务配置。
  const env = loadEnv();
  // logger 统一写入 stderr，避免污染 MCP stdio 协议的 stdout。
  const logger = createLogger(env.MCP_LOG_LEVEL);
  // server 是集中注册了资源与工具的 MCP 服务实例。
  const server = createServer(env);
  // transport 使用 stdio，适配本地 MCP 客户端启动方式。
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info(`${env.MCP_SERVER_NAME} MCP server connected over stdio`);
}

main().catch((error: unknown) => {
  // logger 用于输出启动阶段的致命错误。
  const logger = createLogger('error');
  // message 将未知错误统一转换为可读文本，方便定位启动失败原因。
  const message = error instanceof Error ? error.stack ?? error.message : String(error);

  logger.error(message);
  process.exit(1);
});
