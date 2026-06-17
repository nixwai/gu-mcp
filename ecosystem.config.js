import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// rootDir 标记项目根目录，避免 PM2 从其他目录启动时路径漂移。
const rootDir = dirname(fileURLToPath(import.meta.url));

// logDir 集中保存 PM2 日志，配置加载时确保目录已存在。
const logDir = join(rootDir, 'logs', 'pm2');

mkdirSync(logDir, { recursive: true });

export default {
  apps: [
    {
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

      // 应用日志统一写入 stderr；error_file 是主要运行日志，out_file 仅兜底异常 stdout。
      out_file: join(logDir, 'gu-mcp-http.out.log'),
      error_file: join(logDir, 'gu-mcp-http.error.log'),
      log_file: join(logDir, 'gu-mcp-http.combined.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
