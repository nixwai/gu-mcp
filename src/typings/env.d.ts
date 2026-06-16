// LogLevel 表示服务支持的日志等级。
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

// AppEnv 表示应用运行时可使用的完整环境配置。
export interface AppEnv {
  MCP_HTTP_HOST: string;
  MCP_HTTP_PATH: string;
  MCP_HTTP_PORT: number;
  MCP_LOG_LEVEL: LogLevel;
  MCP_SERVER_DESCRIPTION: string;
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
}
