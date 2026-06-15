import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  ParsedSkillMarkdown,
  RecommendedSkillTarget,
  RuntimeEnvironmentHints,
  SkillDetail,
  SkillInstallInstructions,
  SkillScanResult,
  SkillSummary,
} from '../typings/skills.js';

// SKILL_FILE_NAME 是每个 skill 目录内约定的入口文件名。
const SKILL_FILE_NAME = 'SKILL.md';
// SKILL_NAME_PATTERN 与 Codex skill 命名约定保持一致：小写字母、数字和短横线。
const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * 扫描项目根目录下的 skills 文件夹，返回可用 skill 及解析告警。
 *
 * 列表接口面向“尽量展示可用内容”的场景，所以这里不会因为单个坏目录中断整个扫描：
 * - 缺少 SKILL.md 的目录会被跳过并写入 warnings；
 * - frontmatter 不完整或名称重复的 skill 会被跳过并写入 warnings；
 * - 正常解析的 skill 会按名称排序，保证 MCP 客户端看到稳定结果。
 */
export async function scanProjectSkills(): Promise<SkillScanResult> {
  // skillsRoot 可能来自当前工作目录，也可能来自打包后的 dist 相对路径。
  const skillsRoot = await resolveProjectSkillsRoot();

  if (!(await isDirectory(skillsRoot))) {
    return {
      skills: [],
      warnings: [`Skills root not found: ${skillsRoot}`],
    };
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skills: SkillSummary[] = [];
  const warnings: string[] = [];
  // seenNames 用于防止多个目录声明同一个 skill 名称，避免 get/install 语义不确定。
  const seenNames = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = path.join(skillsRoot, entry.name);
    const skillFile = path.join(directory, SKILL_FILE_NAME);

    if (!(await isFile(skillFile))) {
      // 列表扫描保持容错：一个目录不合规，不影响其他 skill 被发现。
      warnings.push(`Skipped ${directory}: missing ${SKILL_FILE_NAME}`);
      continue;
    }

    try {
      const skill = await readSkillFile(skillFile, directory);

      if (seenNames.has(skill.name)) {
        warnings.push(`Skipped ${directory}: duplicate skill name "${skill.name}"`);
        continue;
      }

      if (entry.name !== skill.name) {
        // 目录名和声明名不一致不一定阻断使用，但提示维护者后续统一。
        warnings.push(`Loaded ${directory}: folder name differs from declared skill name "${skill.name}"`);
      }

      seenNames.add(skill.name);
      skills.push(toSkillSummary(skill));
    } catch (error: unknown) {
      warnings.push(`Skipped ${directory}: ${formatError(error)}`);
    }
  }

  skills.sort((left, right) => left.name.localeCompare(right.name));

  return { skills, warnings };
}

/**
 * 按 skill 名称读取完整内容。
 *
 * 与 scanProjectSkills 的“尽量列出”不同，get/install 是按名称精确访问：
 * - 如果同名目录存在但无效，直接抛出明确错误；
 * - 如果多个目录声明同名 skill，直接抛出冲突错误；
 * - 如果目录名等于请求名但 frontmatter 声明了别的名称，也视为配置错误。
 */
export async function getProjectSkill(name: string): Promise<SkillDetail> {
  assertSkillName(name);

  const skillsRoot = await resolveProjectSkillsRoot();

  if (!(await isDirectory(skillsRoot))) {
    throw new Error(`Skills root not found: ${skillsRoot}`);
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const matches: SkillDetail[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = path.join(skillsRoot, entry.name);
    const skillFile = path.join(directory, SKILL_FILE_NAME);

    if (!(await isFile(skillFile))) {
      // 请求目标目录存在但没有入口文件时，需要把问题暴露给调用方。
      if (entry.name === name) {
        throw new Error(`Skill "${name}" is missing ${SKILL_FILE_NAME}`);
      }

      continue;
    }

    try {
      const skill = await readSkillFile(skillFile, directory);

      if (entry.name === name && skill.name !== name) {
        // 防止调用 get_skill({ name: "foo" }) 时意外读到声明为 "bar" 的目录。
        throw new Error(`folder declares skill name "${skill.name}"`);
      }

      if (skill.name === name) {
        matches.push(skill);
      }
    } catch (error: unknown) {
      if (entry.name === name) {
        // 同名目录的解析错误是用户当前请求的核心错误，不能被静默跳过。
        throw new Error(`Skill "${name}" is invalid: ${formatError(error)}`);
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(`Skill "${name}" was not found in ${skillsRoot}`);
  }

  if (matches.length > 1) {
    throw new Error(`Skill "${name}" is declared by multiple folders in ${skillsRoot}`);
  }

  const [skill] = matches;

  if (skill === undefined) {
    throw new Error(`Skill "${name}" was not found in ${skillsRoot}`);
  }

  return skill;
}

/**
 * 为说明式安装工具生成环境线索、推荐目标和人工安装步骤。
 *
 * 这个函数只组织说明，不执行复制、不创建目录、不覆盖已有 skill。
 * 目标目录由调用方 AI 结合提示词和环境线索决定，避免 MCP 工具在用户不知情时修改全局 Codex 配置。
 */
export function createSkillInstallInstructions(skill: SkillDetail): SkillInstallInstructions {
  const environmentHints = getRuntimeEnvironmentHints();
  const recommendedTargets = createRecommendedTargets(skill, environmentHints);

  return {
    name: skill.name,
    note: 'This tool only returns installation instructions. It does not copy files, overwrite existing skills, or modify global Codex configuration.',
    recommendedTargets,
    selectedByAiPolicy: {
      decisionOwner: 'calling_ai',
      environmentHints,
      rule: 'The calling AI should choose a target based on the current prompt and runtime environment: prefer CODEX_HOME/skills when CODEX_HOME exists, otherwise use the user Codex skills directory, and use the project skills directory only when the prompt asks for project-local installation or testing.',
    },
    sourceDir: skill.directory,
    steps: [
      'Choose one recommended target directory according to the current prompt and environment hints.',
      `Copy the whole source directory to the chosen target as ${skill.name}.`,
      'If the target skill already exists, overwrite only when the user intent clearly asks for replacement; otherwise ask for confirmation first.',
      'After copying, restart or refresh the client that loads Codex skills so it can discover the installed skill.',
    ],
  };
}

/**
 * 解析当前项目的 skills 根目录。
 *
 * 开发态通常以项目根目录为 cwd；打包运行时 import.meta.url 会落在 dist 内。
 * 因此这里按候选路径顺序查找，优先返回真实存在的目录；若都不存在，则返回第一个候选路径，
 * 让上层可以生成稳定的 “not found” 告警。
 */
async function resolveProjectSkillsRoot(): Promise<string> {
  const [firstCandidate] = getSkillsRootCandidates();

  for (const candidate of getSkillsRootCandidates()) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }

  if (firstCandidate === undefined) {
    return path.resolve('skills');
  }

  return firstCandidate;
}

/**
 * 生成 skills 根目录候选列表。
 *
 * 候选顺序从最贴近用户启动位置到最贴近源码/产物位置：
 * 1. process.cwd()/skills：适配从仓库根目录启动的开发场景；
 * 2. moduleDirectory/../skills：适配源码直接运行时的 src 结构；
 * 3. moduleDirectory/../../skills：适配打包后从 dist 内反推仓库根目录。
 */
function getSkillsRootCandidates(): string[] {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'skills'),
    path.resolve(moduleDirectory, '..', 'skills'),
    path.resolve(moduleDirectory, '..', '..', 'skills'),
  ];

  return [...new Set(candidates)];
}

/**
 * 读取并解析单个 SKILL.md，补齐文件路径和目录路径等运行时元数据。
 */
async function readSkillFile(skillFile: string, directory: string): Promise<SkillDetail> {
  const content = await readFile(skillFile, 'utf8');
  const parsed = parseSkillMarkdown(content, skillFile);

  return {
    body: parsed.body,
    content,
    description: parsed.description,
    directory,
    name: parsed.name,
    skillFile,
  };
}

/**
 * 解析 SKILL.md 的 YAML frontmatter 与正文。
 *
 * 当前项目只需要 name 和 description 两个字段，因此使用轻量解析：
 * - 要求文件以 --- frontmatter --- 开头；
 * - 校验 name 不能为空且符合 skill 命名规则；
 * - 校验 description 不能为空；
 * - body 保留 Markdown 正文，仅去除开头空白。
 */
function parseSkillMarkdown(content: string, skillFile: string): ParsedSkillMarkdown {
  // 兼容带 UTF-8 BOM 的 Markdown 文件，避免 frontmatter 正则匹配失败。
  const normalizedContent = content.replace(/^\uFEFF/, '');
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(normalizedContent);

  if (frontmatterMatch === null) {
    throw new Error(`${skillFile} must start with YAML frontmatter`);
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  if (frontmatter === undefined || body === undefined) {
    throw new Error(`${skillFile} has incomplete YAML frontmatter`);
  }

  const fields = parseSimpleYamlFields(frontmatter);
  const name = fields.get('name');
  const description = fields.get('description');

  if (name === undefined || name.trim().length === 0) {
    throw new Error(`${skillFile} is missing frontmatter field "name"`);
  }

  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`${skillFile} has invalid skill name "${name}"`);
  }

  if (description === undefined || description.trim().length === 0) {
    throw new Error(`${skillFile} is missing frontmatter field "description"`);
  }

  return {
    body: body.trimStart(),
    description: description.trim(),
    name: name.trim(),
  };
}

/**
 * 解析本项目需要的简单 YAML 字段。
 *
 * 这是有意保持轻量的解析器，不覆盖完整 YAML 规范；它支持：
 * - key: value 单行字段；
 * - 单引号或双引号包裹的值；
 * - |、|-、>、>- 四种块标量，用于较长 description。
 */
function parseSimpleYamlFields(frontmatter: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = frontmatter.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line === undefined || line.trim().length === 0 || line.trimStart().startsWith('#')) {
      continue;
    }

    const match = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/.exec(line);

    if (match === null) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2] ?? '';

    if (key === undefined) {
      continue;
    }

    if (isBlockScalar(rawValue)) {
      const blockLines: string[] = [];

      // 块标量只读取紧随其后的缩进行，回到顶格时视为下一个 YAML 字段。
      while (index + 1 < lines.length && isIndentedLine(lines[index + 1])) {
        index += 1;
        blockLines.push((lines[index] ?? '').trim());
      }

      fields.set(key, rawValue.startsWith('|') ? blockLines.join('\n') : blockLines.join(' '));
      continue;
    }

    fields.set(key, stripWrappingQuotes(rawValue.trim()));
  }

  return fields;
}

/**
 * 判断 YAML 字段值是否为块标量起始符。
 */
function isBlockScalar(value: string): boolean {
  return value === '|' || value === '|-' || value === '>' || value === '>-';
}

/**
 * 判断一行是否属于前一个 YAML 块标量的缩进内容。
 */
function isIndentedLine(line: string | undefined): boolean {
  return line !== undefined && (line.startsWith(' ') || line.startsWith('\t'));
}

/**
 * 去掉简单字符串值外层的单引号或双引号。
 */
function stripWrappingQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * 将完整 skill 详情压缩为列表接口需要的摘要字段。
 */
function toSkillSummary(skill: SkillDetail): SkillSummary {
  return {
    description: skill.description,
    directory: skill.directory,
    name: skill.name,
    skillFile: skill.skillFile,
  };
}

/**
 * 根据运行环境生成推荐安装目标。
 *
 * 这里不替调用方做最终选择，只按优先级给出候选：
 * - CODEX_HOME/skills：显式配置的 Codex skill 根目录，优先级最高；
 * - 用户 ~/.codex/skills：没有 CODEX_HOME 时的常规全局目录；
 * - 项目 skills/：用于项目内测试或提示词明确要求本地安装的场景。
 */
function createRecommendedTargets(
  skill: SkillDetail,
  environmentHints: RuntimeEnvironmentHints,
): RecommendedSkillTarget[] {
  const codexHomeTarget =
    environmentHints.CODEX_HOME === null ? null : path.join(environmentHints.CODEX_HOME, 'skills');
  const userCodexTarget =
    environmentHints.HOME !== null
      ? path.join(environmentHints.HOME, '.codex', 'skills')
      : environmentHints.USERPROFILE === null
        ? null
        : path.join(environmentHints.USERPROFILE, '.codex', 'skills');
  const projectSkillsRoot = path.dirname(skill.directory);

  return [
    {
      available: codexHomeTarget !== null,
      label: 'codex-home-skills',
      path: codexHomeTarget,
      priority: 1,
      when: 'Use when CODEX_HOME is set; this is the preferred Codex skill root.',
    },
    {
      available: userCodexTarget !== null,
      label: 'user-codex-skills',
      path: userCodexTarget,
      priority: 2,
      when: 'Use when CODEX_HOME is not set and the user wants a global Codex skill.',
    },
    {
      available: true,
      label: 'project-skills',
      path: projectSkillsRoot,
      priority: 3,
      when: 'Use when the prompt asks for project-local installation, repository fixtures, or testing this MCP server.',
    },
  ];
}

/**
 * 收集会影响安装目标判断的运行环境线索。
 */
function getRuntimeEnvironmentHints(): RuntimeEnvironmentHints {
  return {
    CODEX_HOME: normalizeEnvValue(process.env.CODEX_HOME),
    HOME: normalizeEnvValue(process.env.HOME),
    USERPROFILE: normalizeEnvValue(process.env.USERPROFILE),
    cwd: process.cwd(),
    platform: process.platform,
  };
}

/**
 * 将空字符串或缺失环境变量统一归一为 null，便于结构化输出表达 “不可用”。
 */
function normalizeEnvValue(value: string | undefined): string | null {
  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  return value;
}

/**
 * 在访问文件系统前先校验 skill 名称，避免把任意路径片段当作目录名处理。
 */
function assertSkillName(name: string): void {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid skill name "${name}". Use lowercase letters, digits, and hyphens.`);
  }
}

/**
 * 安全判断路径是否为目录；不存在或无权限时返回 false。
 */
async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const targetStat = await stat(targetPath);
    return targetStat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 安全判断路径是否为普通文件；不存在或无权限时返回 false。
 */
async function isFile(targetPath: string): Promise<boolean> {
  try {
    const targetStat = await stat(targetPath);
    return targetStat.isFile();
  } catch {
    return false;
  }
}

/**
 * 将 unknown 错误转换为可展示的字符串，避免工具返回不可序列化对象。
 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
