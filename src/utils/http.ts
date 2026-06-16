import type { IncomingMessage, ServerResponse } from 'node:http';

// jsonContentType 是入口直接返回 JSON 错误时使用的响应类型。
const jsonContentType = 'application/json; charset=utf-8';

/**
 * 判断请求路径是否命中当前 HTTP 端点。
 */
export function isConfiguredPath(request: IncomingMessage, configuredPath: string): boolean {
  // url 保存请求 URL，使用本地占位 origin 只为解析 path。
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');

  return url.pathname === configuredPath;
}

/**
 * 读取请求体并解析为 JSON。
 */
export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  // chunks 保存请求体分片，避免直接操作字符串拼接。
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  // rawBody 保存完整请求体文本。
  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (!rawBody.trim()) {
    throw new Error('Request body is empty');
  }

  return JSON.parse(rawBody) as unknown;
}

/**
 * 读取单值请求头，忽略数组形式中的后续值。
 */
export function readSingleHeader(request: IncomingMessage, name: string): string | undefined {
  // value 保存 Node HTTP 解析出的原始请求头值。
  const value = request.headers[name];

  return Array.isArray(value) ? value[0] : value;
}

/**
 * 向客户端写入 JSON-RPC 风格错误响应。
 */
export function sendJsonRpcError(response: ServerResponse, statusCode: number, code: number, message: string): void {
  response.writeHead(statusCode, { 'content-type': jsonContentType });
  response.end(
    JSON.stringify({
      error: {
        code,
        message,
      },
      id: null,
      jsonrpc: '2.0',
    }),
  );
}

/**
 * 向客户端写入纯文本响应。
 */
export function sendText(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(message);
}
