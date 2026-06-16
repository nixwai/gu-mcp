import type { Server as NodeHttpServer } from 'node:http';

import type { HttpSession } from '../typings/http.js';
import type { Logger } from '../typings/logger.js';

/**
 * 注册进程退出处理，确保 HTTP server 与所有 session transport 被关闭。
 */
export function registerShutdownHandlers(
  httpServer: NodeHttpServer,
  sessions: Map<string, HttpSession>,
  logger: Logger,
): void {
  // shutdown 负责按信号来源执行一次性清理。
  let shuttingDown = false;

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down HTTP MCP server`);

    await closeSessions(sessions, logger);

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    process.exit(0);
  }

  process.on('SIGINT', (signal) => {
    void shutdown(signal);
  });
  process.on('SIGTERM', (signal) => {
    void shutdown(signal);
  });
}

/**
 * 关闭所有 HTTP MCP 会话。
 */
async function closeSessions(sessions: Map<string, HttpSession>, logger: Logger): Promise<void> {
  // closingSessions 保存当前快照，避免关闭过程中 map 变化影响遍历。
  const closingSessions = [...sessions.entries()];

  for (const [sessionId, session] of closingSessions) {
    try {
      logger.debug(`Closing MCP HTTP session ${sessionId}`);
      await session.transport.close();
      await session.server.close();
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      logger.error(message);
    } finally {
      sessions.delete(sessionId);
    }
  }
}
