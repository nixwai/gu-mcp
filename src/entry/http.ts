import {
  createServer as createNodeHttpServer,
  type Server as NodeHttpServer,
} from 'node:http';

import { loadEnv } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import { handleHttpRequest } from '../server/http-handler.js';
import { registerShutdownHandlers } from '../server/http-shutdown.js';
import type { HttpSession } from '../typings/http.js';

/**
 * 启动 Streamable HTTP 模式：监听单一路径并按 mcp-session-id 管理有状态会话。
 */
async function main(): Promise<void> {
  // env 保存当前进程读取并校验后的服务配置。
  const env = loadEnv();
  // logger 统一写入 stderr，避免 HTTP 日志污染 stdout。
  const logger = createLogger(env.MCP_LOG_LEVEL);
  // sessions 只属于 HTTP 模式，用于维护 session id 到 transport/server 的映射。
  const sessions = new Map<string, HttpSession>();
  // httpServer 是 Node 内置 HTTP 服务，负责把请求分发给 MCP transport。
  const httpServer = createNodeHttpServer((request, response) => {
    void handleHttpRequest(request, response, env, logger, sessions);
  });

  httpServer.on('error', (error) => {
    logger.error(error.stack ?? error.message);
  });

  await listen(httpServer, env.MCP_HTTP_HOST, env.MCP_HTTP_PORT);
  logger.info(
    `${env.MCP_SERVER_NAME} MCP server listening over Streamable HTTP at http://${env.MCP_HTTP_HOST}:${env.MCP_HTTP_PORT}${env.MCP_HTTP_PATH}`,
  );

  registerShutdownHandlers(httpServer, sessions, logger);
}

/**
 * 等待 Node HTTP server 完成监听。
 */
function listen(server: NodeHttpServer, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

main().catch((error: unknown) => {
  // logger 用于输出启动阶段的致命错误。
  const logger = createLogger('error');
  // message 将未知错误统一转换为可读文本，方便定位启动失败原因。
  const message = error instanceof Error ? error.stack ?? error.message : String(error);

  logger.error(message);
  process.exit(1);
});
