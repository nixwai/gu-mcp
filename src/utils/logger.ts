import type { LogLevel } from '../typings/env.js';
import type { Logger, PrintableLogLevel } from '../typings/logger.js';

// levelWeight 用数值权重控制日志等级过滤。
const levelWeight: Record<PrintableLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * 创建 stderr logger，确保普通日志不会写入 MCP 协议使用的 stdout。
 */
export function createLogger(minLevel: LogLevel): Logger {
  /**
   * 根据最小日志等级写入单条日志。
   */
  function write(level: PrintableLogLevel, message: string): void {
    if (minLevel === 'silent' || levelWeight[level] < levelWeight[minLevel]) {
      return;
    }

    // timestamp 标记日志发生时间，便于排查本地服务启动问题。
    const timestamp = new Date().toISOString();
    process.stderr.write(`[${timestamp}] ${level.toUpperCase()} ${message}\n`);
  }

  return {
    debug: (message) => write('debug', message),
    error: (message) => write('error', message),
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
  };
}
