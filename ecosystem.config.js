import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// rootDir 标记项目根目录，避免 PM2 从其他目录启动时路径漂移。
const rootDir = dirname(fileURLToPath(import.meta.url));

// logDir 集中保存 PM2 日志，配置加载时确保目录已存在。
const logDir = join(rootDir, 'logs', 'pm2');

mkdirSync(logDir, { recursive: true });

// apps 是 PM2 ecosystem 的应用列表；命名导出可兼容 type: module 项目中的 ecosystem.config.js。
export const apps = [
  {
    // HTTP 模式可由 PM2 常驻托管；stdio 模式需要 MCP 客户端直接接管标准输入输出。
    name: 'gu-mcp-http',
    cwd: rootDir,
    script: './dist/http.js',
    interpreter: 'node',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    kill_timeout: 5000,

    // 项目运行日志写入 stderr；error_file 是主要应用日志，out_file 仅用于兜底异常 stdout。
    out_file: join(logDir, 'gu-mcp-http.out.log'),
    error_file: join(logDir, 'gu-mcp-http.error.log'),
    log_file: join(logDir, 'gu-mcp-http.combined.log'),
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',

    env: {
      NODE_ENV: 'production',
    },
  },
];
