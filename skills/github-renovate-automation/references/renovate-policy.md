# Renovate Policy

仅在执行 Renovate、CI 或自托管配置时读取。核心确认顺序和输出契约以 `SKILL.md` 为准。

## 包管理器识别

优先读取 `package.json#packageManager`，其次使用唯一锁文件，再参考现有 CI。存在冲突时停止并询问。

| 包管理器 | 锁文件 | 冻结安装命令 |
|---|---|---|
| pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| npm | `package-lock.json` / `npm-shrinkwrap.json` | `npm ci` |
| Yarn Berry | `yarn.lock` + `.yarnrc.yml` | `yarn install --immutable` |
| Yarn Classic | `yarn.lock` | `yarn install --frozen-lockfile` |
| bun | `bun.lock` / `bun.lockb` | `bun install --frozen-lockfile` |

## 决策矩阵

| 决策 | 默认/要求 | 行为 |
|---|---|---|
| 接入方式 | 必须明确 | GitHub App 或 GitHub Actions 自托管 |
| 非重大自动合并 | 默认开启 | 用户明确拒绝时关闭 |
| major 自动合并 | 必须明确 | 严格使用用户选择 |
| 无有效 CI | 强制阻止 | 所有 `automerge` 设为 `false` |
| required approvals > 0 | 不静默修改 | 单独确认；否则保留并报告阻塞 |

## 配置不存在时

- Hosted App：创建根目录 `renovate.json` 并让它进入默认分支；如果 App 已先创建 Configure Renovate/Onboarding PR，检查内容后选择合并该 PR 或用本地配置替代，避免保留两个配置入口。
- 自托管：必须先创建并提交仓库级 `renovate.json`。当前全局配置使用 `onboarding: false` 与 `requireConfig: 'required'`，缺少仓库配置时会跳过目标仓库。
- 只创建本地文件不代表 Renovate 已接入；配置必须存在于默认分支，或 Hosted App 的 Onboarding PR 已合并。
- 最终必须观察到 Onboarding PR、Dependency Dashboard、成功 Mend/Actions Job 或首个依赖 PR 中的至少一项，才能判定 Renovate 已激活。

## Renovate 基准配置

以下有效示例表示：非重大更新自动合并，major 更新不自动合并。

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":configMigration",
    "security:minimumReleaseAgeNpm"
  ],
  "rangeStrategy": "bump",
  "automergeType": "pr",
  "platformAutomerge": true,
  "ignoreTests": false,
  "pruneStaleBranches": true,
  "packageRules": [
    {
      "description": "Group all non-major dependency updates",
      "groupName": "all non-major dependencies",
      "groupSlug": "all-non-major",
      "matchUpdateTypes": [
        "minor",
        "patch",
        "pin",
        "digest"
      ],
      "automerge": true
    },
    {
      "description": "Apply the selected major update policy",
      "matchUpdateTypes": [
        "major"
      ],
      "automerge": false
    }
  ]
}
```

只修改对应 rule 的 `automerge`：

- 用户拒绝非重大自动合并：第一条设为 `false`。
- 用户同意 major 自动合并：第二条设为 `true`。
- CI 无有效项目检查或验证失败：两条都设为 `false`。

不要设置顶层 `automerge: true`，避免未分类更新意外合并。`rangeStrategy` 必须放在顶层，不能与 `matchUpdateTypes` 位于同一 package rule。

## 合并现有配置

- 优先修改仓库当前使用的配置入口；多个入口时先确认。
- 保留未知的 `extends`、registry、host rules、schedule、labels、reviewers、ignore 和 package rules。
- 通过 `groupSlug: "all-non-major"` 或本 Skill 的 description 定位并更新自身规则。
- 发现规则可能覆盖时解释最终结果，不依靠数组顺序猜测。
- 不默认加入 `:maintainLockFilesWeekly`，因为它会有意产生可能只改锁文件的 PR；用户要求刷新传递依赖时再加入并解释行为。
- 历史 pnpm 或 Renovate 版本排除不能复制为永久配置；只在当前日志和官方问题确认后临时添加。

## package.json 更新边界

顶层 `rangeStrategy: "bump"` 应提升直接依赖版本范围：

```diff
- "vite": "^7.0.0"
+ "vite": "^7.0.5"
```

纯传递依赖没有 `package.json` 声明，只能更新锁文件；这不是配置失败。

## CI 必需检查

创建或补全稳定名称为 `verify` 的检查。更新现有完整工作流，不创建重复 CI，不删除无关 job。

优先运行：

1. typecheck、type-check、check:types。
2. 不修改文件的 lint、stylelint。
3. 非交互式 test 或 coverage。
4. build。
5. docs:build、play:build、example:build 等可终止构建。

排除名称或内容包含 `fix`、`write`、`dev`、`watch`、`serve`、`release`、`publish`、`deploy` 的命令。test 与 coverage 执行同一测试集时只选一个，优先项目已有 CI 命令，其次选择 coverage。

Workflow 必须：

- 在 `pull_request` 上覆盖默认分支。
- 使用冻结锁文件安装。
- job/check 稳定显示为 `verify`。
- 默认只授予 `contents: read`。
- 固定第三方 Actions 到当前官方稳定版本的完整提交 SHA，并保留版本注释。
- 不运行自动修复、发布、版本变更或部署命令。

仅安装成功不算有效检查。没有有效检查脚本时可创建骨架，但必须保持 automerge 关闭。

## 自托管 Renovate

仓库依赖策略必须存在于默认分支的 `renovate.json`；不存在时先创建。自托管全局设置使用单独文件，例如 `.github/renovate-config.js`：

```js
module.exports = {
  platform: 'github',
  repositories: [process.env.RENOVATE_REPOSITORY],
  onboarding: false,
  requireConfig: 'required',
}
```

工作流结构：

```yaml
name: Renovate

on:
  workflow_dispatch:
  schedule:
    - cron: "17 1 * * *"

permissions:
  contents: read

jobs:
  renovate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@<current-full-commit-sha> # current stable release
        with:
          persist-credentials: false

      - name: Run Renovate
        uses: renovatebot/github-action@<current-full-commit-sha> # current stable release
        with:
          configurationFile: .github/renovate-config.js
          token: ${{ secrets.RENOVATE_TOKEN }}
        env:
          RENOVATE_REPOSITORY: ${{ github.repository }}
```

提交前从官方仓库解析当前稳定版本和完整 SHA，替换全部占位符。

### 凭据

- 优先 GitHub App Token；否则使用最小权限 PAT，并存入 Actions Secret。
- 不使用普通 `GITHUB_TOKEN` 作为 Renovate 凭据，避免 Renovate PR 无法触发后续检查。
- 不在配置、workflow、命令、日志或报告中写入 Secret 值。
- Renovate 更新 `.github/workflows` 时，凭据必须具备 GitHub 当前要求的 workflow 修改权限；不足时停止并报告。

## 验证

根据环境使用严格验证：

```bash
pnpm --package=renovate dlx renovate-config-validator --strict --no-global renovate.json
```

或：

```bash
npx --yes renovate-config-validator --strict --no-global renovate.json
```

然后检查 workflow YAML、JavaScript 全局配置、冻结安装、`verify` 全部命令、`git diff --check` 和凭据泄露。任一步失败都保持 automerge 关闭。

官方参考：

- https://docs.renovatebot.com/configuration-options/
- https://docs.renovatebot.com/getting-started/running/
- https://github.com/renovatebot/github-action