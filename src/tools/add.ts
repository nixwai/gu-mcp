import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { addNumbers } from '../utils/math.js';

/**
 * 注册加法演示工具，展示最小可用的 MCP tool 输入与输出结构。
 */
export function registerAddTool(server: McpServer): void {
  server.registerTool(
    'add',
    {
      description: 'Add two numbers and return the result.',
      inputSchema: {
        a: z.number().describe('The first number.'),
        b: z.number().describe('The second number.'),
      },
      outputSchema: {
        result: z.number().describe('The sum of a and b.'),
      },
      title: 'Addition Demo',
    },
    ({ a, b }) => {
      // output 是结构化返回值，便于客户端直接读取计算结果。
      const output = { result: addNumbers(a, b) };

      return {
        content: [
          {
            text: JSON.stringify(output),
            type: 'text',
          },
        ],
        structuredContent: output,
      };
    },
  );
}
