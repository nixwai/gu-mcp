import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

import type { AppEnv } from '../typings/env.js';

// 静默加载 .env，避免 dotenv 默认日志写入 stdout 破坏 MCP stdio 协议。
loadDotenv({ quiet: true });

// logLevels 定义服务允许的日志等级枚举。
const logLevels = ['debug', 'info', 'warn', 'error', 'silent'] as const;

// envSchema 负责声明、默认值填充与校验全部环境变量。
const envSchema = z.object({
  MCP_LOG_LEVEL: z.enum(logLevels).default('info'),
  MCP_SERVER_DESCRIPTION: z.string().trim().min(1).default('基础 Node TypeScript MCP 服务。'),
  MCP_SERVER_NAME: z.string().trim().min(1).default('gu-mcp'),
  MCP_SERVER_VERSION: z.string().trim().min(1).default('0.1.0'),
});

/**
 * 读取并校验环境变量，返回带默认值的应用配置。
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  // parsed 保存 Zod 校验结果，便于统一处理错误信息。
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    // message 提供格式化后的环境变量错误详情。
    const message = z.prettifyError(parsed.error);
    throw new Error(`Invalid environment configuration:\n${message}`);
  }

  return parsed.data;
}
