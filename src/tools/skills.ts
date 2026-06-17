import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  createSkillInstallInstructions,
  getProjectSkill,
  scanProjectSkills,
} from '../utils/skills.js';
import type { SkillScanResult, SkillSummary } from '../typings/skills.js';

// skillFileSchema 描述 skill 目录内一个可安装文件的结构化载荷。
const skillFileSchema = z.object({
  absolutePath: z.string(),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']),
  relativePath: z.string(),
  sizeBytes: z.number(),
});

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
            latestVersion: z.string(),
            name: z.string(),
            skillFile: z.string(),
            title: z.string(),
          }),
        ),
        warnings: z.array(z.string()),
      },
      title: 'List Project Skills',
    },
    async () => {
      const output = await scanProjectSkills();
      return createToolResult(output, formatSkillListTable(output));
    },
  );

  server.registerTool(
    'get_skill',
    {
      description:
        'Get metadata, full SKILL.md content, and all files for one project skill.',
      inputSchema: {
        name: z.string().describe('The skill name, such as prompt-enhancer.'),
      },
      outputSchema: {
        skill: z.object({
          body: z.string(),
          content: z.string(),
          description: z.string(),
          directory: z.string(),
          fileCount: z.number(),
          files: z.array(skillFileSchema),
          latestVersion: z.string(),
          name: z.string(),
          skillFile: z.string(),
          title: z.string(),
          totalBytes: z.number(),
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
        fileCount: z.number(),
        files: z.array(skillFileSchema),
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
        totalBytes: z.number(),
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

function createToolResult<T extends object>(output: T, text = JSON.stringify(output, null, 2)) {
  return {
    content: [
      {
        text,
        type: 'text' as const,
      },
    ],
    structuredContent: output as Record<string, unknown>,
  };
}

function formatSkillListTable(output: SkillScanResult): string {
  const rows = output.skills.map(formatSkillSummaryRow);
  const table = ['| Name | 标题 | 最新版本 |', '| --- | --- | --- |', ...rows].join('\n');

  if (output.warnings.length === 0) {
    return table;
  }

  const warnings = output.warnings.map((warning) => `- ${warning}`).join('\n');

  return `${table}\n\nWarnings:\n${warnings}`;
}

function formatSkillSummaryRow(skill: SkillSummary): string {
  return [
    escapeMarkdownTableCell(skill.name),
    escapeMarkdownTableCell(skill.title),
    escapeMarkdownTableCell(skill.latestVersion),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |');
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
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
