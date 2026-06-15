// SkillSummary 表示列表接口中暴露的最小 skill 元数据。
export interface SkillSummary {
  description: string;
  directory: string;
  name: string;
  skillFile: string;
}

// SkillDetail 表示单个 skill 的完整 Markdown 内容与解析结果。
export interface SkillDetail extends SkillSummary {
  body: string;
  content: string;
}

// SkillScanResult 聚合扫描成功的 skill 与可继续处理的告警。
export interface SkillScanResult {
  skills: SkillSummary[];
  warnings: string[];
}

// RuntimeEnvironmentHints 暴露给调用方 AI，用于自行判断安装目标。
export interface RuntimeEnvironmentHints {
  CODEX_HOME: string | null;
  HOME: string | null;
  USERPROFILE: string | null;
  cwd: string;
  platform: NodeJS.Platform;
}

// RecommendedSkillTarget 描述一个可选安装目标及其适用场景。
export interface RecommendedSkillTarget {
  available: boolean;
  label: string;
  path: string | null;
  priority: number;
  when: string;
}

// SkillInstallInstructions 是说明式安装工具的结构化返回值。
export interface SkillInstallInstructions {
  name: string;
  note: string;
  recommendedTargets: RecommendedSkillTarget[];
  selectedByAiPolicy: {
    decisionOwner: 'calling_ai';
    environmentHints: RuntimeEnvironmentHints;
    rule: string;
  };
  sourceDir: string;
  steps: string[];
}

// ParsedSkillMarkdown 表示 SKILL.md 解析后的内部结构。
export interface ParsedSkillMarkdown {
  body: string;
  description: string;
  name: string;
}
