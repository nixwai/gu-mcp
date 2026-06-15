import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  createSkillInstallInstructions,
  getProjectSkill,
  scanProjectSkills,
} from '../utils/skills.js';

/**
 * 注册项目内 skill 的列表、详情和说明式安装工具。
 */
export function registerSkillTools(server: McpServer): void {
  server.registerTool(
    'list_skills',
    {
      description: 'List skills available in this project skills directory.',
      outputSchema: {
        skills: z.array(
          z.object({
            description: z.string(),
            directory: z.string(),
            name: z.string(),
            skillFile: z.string(),
          }),
        ),
        warnings: z.array(z.string()),
      },
      title: 'List Project Skills',
    },
    async () => {
      const output = await scanProjectSkills();
      return createToolResult(output);
    },
  );

  server.registerTool(
    'get_skill',
    {
      description: 'Get metadata and full SKILL.md content for one project skill.',
      inputSchema: {
        name: z.string().describe('The skill name, such as prompt-enhancer.'),
      },
      outputSchema: {
        skill: z.object({
          body: z.string(),
          content: z.string(),
          description: z.string(),
          directory: z.string(),
          name: z.string(),
          skillFile: z.string(),
        }),
      },
      title: 'Get Project Skill',
    },
    async ({ name }) => {
      try {
        const skill = await getProjectSkill(name);
        return createToolResult({ skill });
      } catch (error: unknown) {
        return createErrorResult(error);
      }
    },
  );

  server.registerTool(
    'install_skill',
    {
      description:
        'Return installation instructions for one project skill. This tool does not copy files or accept a target directory.',
      inputSchema: {
        name: z.string().describe('The skill name, such as prompt-enhancer.'),
      },
      outputSchema: {
        name: z.string(),
        note: z.string(),
        recommendedTargets: z.array(
          z.object({
            available: z.boolean(),
            label: z.string(),
            path: z.string().nullable(),
            priority: z.number(),
            when: z.string(),
          }),
        ),
        selectedByAiPolicy: z.object({
          decisionOwner: z.literal('calling_ai'),
          environmentHints: z.object({
            CODEX_HOME: z.string().nullable(),
            HOME: z.string().nullable(),
            USERPROFILE: z.string().nullable(),
            cwd: z.string(),
            platform: z.string(),
          }),
          rule: z.string(),
        }),
        sourceDir: z.string(),
        steps: z.array(z.string()),
      },
      title: 'Get Skill Install Instructions',
    },
    async ({ name }) => {
      try {
        const skill = await getProjectSkill(name);
        const output = createSkillInstallInstructions(skill);

        return createToolResult(output);
      } catch (error: unknown) {
        return createErrorResult(error);
      }
    },
  );
}

function createToolResult<T extends object>(output: T) {
  return {
    content: [
      {
        text: JSON.stringify(output, null, 2),
        type: 'text' as const,
      },
    ],
    structuredContent: output as Record<string, unknown>,
  };
}

function createErrorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const output = { error: message };

  return {
    content: [
      {
        text: JSON.stringify(output, null, 2),
        type: 'text' as const,
      },
    ],
    isError: true,
  };
}
