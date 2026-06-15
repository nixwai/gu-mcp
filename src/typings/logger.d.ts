// Logger 定义项目内统一使用的日志接口。
export interface Logger {
  debug(message: string): void;
  error(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

// PrintableLogLevel 表示会真实输出到 stderr 的日志等级。
export type PrintableLogLevel = 'debug' | 'info' | 'warn' | 'error';
