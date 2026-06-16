import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { createServer } from './create-server.js';
import type { AppEnv } from '../typings/env.js';
import type { HttpSession } from '../typings/http.js';
import type { Logger } from '../typings/logger.js';
import {
  isConfiguredPath,
  readJsonBody,
  readSingleHeader,
  sendJsonRpcError,
  sendText,
} from '../utils/http.js';

// sessionHeaderName 是 MCP Streamable HTTP 用于复用会话的请求头名称。
const sessionHeaderName = 'mcp-session-id';

// httpMethods 保存本入口支持的 MCP Streamable HTTP 方法集合。
const httpMethods = new Set(['POST', 'GET', 'DELETE']);

/**
 * 处理单个 HTTP 请求，并把合法 MCP 请求转交给对应 Streamable HTTP transport。
 */
export async function handleHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  env: AppEnv,
  logger: Logger,
  sessions: Map<string, HttpSession>,
): Promise<void> {
  try {
    if (!isConfiguredPath(request, env.MCP_HTTP_PATH)) {
      sendText(response, 404, 'Not Found');
      return;
    }

    if (!request.method || !httpMethods.has(request.method)) {
      sendJsonRpcError(response, 405, -32000, 'Method not allowed');
      return;
    }

    if (request.method === 'POST') {
      await handlePostRequest(request, response, env, logger, sessions);
      return;
    }

    await handleSessionRequest(request, response, logger, sessions);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      logger.warn(`Invalid HTTP JSON body: ${error.message}`);
      sendJsonRpcError(response, 400, -32700, 'Parse error: Invalid JSON');
      return;
    }

    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    logger.error(message);

    if (!response.headersSent) {
      sendJsonRpcError(response, 500, -32603, 'Internal server error');
    }
  }
}

/**
 * 处理 POST 请求：初始化请求创建新会话，后续请求复用已有会话。
 */
async function handlePostRequest(
  request: IncomingMessage,
  response: ServerResponse,
  env: AppEnv,
  logger: Logger,
  sessions: Map<string, HttpSession>,
): Promise<void> {
  // sessionId 表示客户端传入的 MCP HTTP 会话标识。
  const sessionId = readSingleHeader(request, sessionHeaderName);
  // body 是预解析后的 JSON-RPC 消息，后续直接传给 SDK transport。
  const body = await readJsonBody(request).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);

    throw new JsonBodyError(detail);
  });

  if (sessionId) {
    // session 保存当前请求匹配到的已初始化 HTTP 会话。
    const session = sessions.get(sessionId);

    if (!session) {
      sendJsonRpcError(response, 404, -32001, 'Session not found');
      return;
    }

    logger.debug(`Received HTTP POST for MCP session ${sessionId}`);
    await session.transport.handleRequest(request, response, body);
    return;
  }

  if (!containsInitializeRequest(body)) {
    sendJsonRpcError(response, 400, -32000, 'Bad Request: No valid session ID provided');
    return;
  }

  await createHttpSession(request, response, body, env, logger, sessions);
}

/**
 * 创建新的 HTTP MCP 会话，并使用初始化请求完成 transport 连接。
 */
async function createHttpSession(
  request: IncomingMessage,
  response: ServerResponse,
  body: unknown,
  env: AppEnv,
  logger: Logger,
  sessions: Map<string, HttpSession>,
): Promise<void> {
  // server 是当前 HTTP session 独占的 MCP 服务实例。
  const server = createServer(env);
  // transport 是当前 HTTP session 独占的 Streamable HTTP 传输。
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, { server, transport });
      logger.info(`MCP HTTP session initialized: ${sessionId}`);
    },
    onsessionclosed: (sessionId) => {
      deleteSession(sessions, sessionId, (deletedSessionId) => {
        logger.info(`MCP HTTP session closed: ${deletedSessionId}`);
      });
    },
  });

  transport.onerror = (error) => {
    logger.error(error.stack ?? error.message);
  };

  transport.onclose = () => {
    // sessionId 在初始化完成后由 SDK transport 生成并持有。
    const sessionId = transport.sessionId;

    if (sessionId) {
      deleteSession(sessions, sessionId, (deletedSessionId) => {
        logger.info(`MCP HTTP session transport closed: ${deletedSessionId}`);
      });
    }
  };

  await server.connect(transport as unknown as Transport);
  await transport.handleRequest(request, response, body);
}

/**
 * 处理 GET 与 DELETE 请求：二者都必须携带有效 mcp-session-id。
 */
async function handleSessionRequest(
  request: IncomingMessage,
  response: ServerResponse,
  logger: Logger,
  sessions: Map<string, HttpSession>,
): Promise<void> {
  // sessionId 表示客户端传入的 MCP HTTP 会话标识。
  const sessionId = readSingleHeader(request, sessionHeaderName);

  if (!sessionId) {
    sendJsonRpcError(response, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
    return;
  }

  // session 保存当前请求匹配到的已初始化 HTTP 会话。
  const session = sessions.get(sessionId);

  if (!session) {
    sendJsonRpcError(response, 404, -32001, 'Session not found');
    return;
  }

  logger.debug(`Received HTTP ${request.method ?? 'UNKNOWN'} for MCP session ${sessionId}`);
  await session.transport.handleRequest(request, response);
}

/**
 * JsonBodyError 表示 HTTP POST 请求体不是可用的 JSON。
 */
class JsonBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonBodyError';
  }
}

/**
 * 检查请求体中是否包含 MCP initialize 请求。
 */
function containsInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some((message) => isInitializeRequest(message));
  }

  return isInitializeRequest(body);
}

/**
 * 删除 HTTP session 映射，并避免重复输出关闭日志。
 */
function deleteSession(
  sessions: Map<string, HttpSession>,
  sessionId: string,
  onDeleted: (sessionId: string) => void,
): void {
  if (!sessions.delete(sessionId)) {
    return;
  }

  onDeleted(sessionId);
}
