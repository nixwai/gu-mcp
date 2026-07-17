---
name: github-renovate-automation
description: >-
  为包含 package.json 的 GitHub Node.js 项目配置、修复或审计 Renovate 依赖自动更新，
  确保直接依赖同时更新 package.json 和锁文件，将非重大更新合并为一个 PR，
  经过 CI 检查后安全自动合并并删除分支；支持 Mend Renovate GitHub App 与 GitHub Actions 自托管。
  当用户要求接入 Renovate、配置依赖更新 PR、自动合并、Ruleset、必需检查、分支清理，
  或排查 Renovate 无法创建、更新或自动合并 PR 时使用。配置 GitHub Settings 时调用浏览器，
  且无论浏览器成功或失败都必须输出完整手动操作步骤。
---

# GitHub Renovate Automation

## 硬性流程

- 固定顺序：只读检查项目 → 锁定必要决策 → 修改 Renovate/CI → 本地验证 → 展示并确认 GitHub Settings 变更 → 配置仓库 Settings → 检查 Renovate 安装与仓库授权 → 缺失时通过浏览器安装或追加授权 → 验证 Renovate 已激活 → 完整结果报告。
- 任何文件修改前必须明确：接入方式是 `Mend Renovate GitHub App` 还是 `GitHub Actions 自托管`，重大更新是否自动合并。只读审计和故障分析不受此限制。
- 非重大更新默认自动合并；只有用户明确拒绝时关闭。
- 自动合并必须经过至少一个有效项目检查。仅安装依赖成功不算有效检查。
- GitHub Settings 写操作前必须再次展示仓库、默认分支、必需检查和全部目标值，并获得明确确认。
- 不静默降低 required approvals、不移除既有保护、不添加 Renovate bypass、不写入或回显凭据。
- 浏览器失败、未登录、无权限、用户取消或只完成部分设置时，仍必须输出每个页面的完整手动配置步骤。

## 项目检查

先收集：

- 用户提供的仓库地址或 `git remote` 中的 GitHub 地址，以及远端默认分支。
- `package.json#packageManager`、锁文件、workspace 配置和全部 scripts。
- 现有 Renovate 配置入口及 `.github/workflows/*.{yml,yaml}`。
- 默认分支是否已经包含有效 Renovate 配置；不要只检查尚未提交的本地文件。
- CI 的触发分支、job/check 名称、安装命令和验证命令。
- 工作区未提交差异，避免覆盖用户已有修改。

优先使用 `packageManager`，其次使用唯一锁文件判断 npm、pnpm、yarn 或 bun。发现冲突锁文件、多个 Renovate 配置入口或无法确认默认分支时先询问，不要猜测。

## 必要决策

仅询问尚未明确的内容：

1. 接入方式：推荐 `Mend Renovate GitHub App`，或选择 `GitHub Actions 自托管`。
2. major 更新是否在 CI 成功后自动合并。

非重大更新默认策略：minor、patch、pin、digest 合并到 `all-non-major` 单一 PR，CI 成功后自动合并并删除分支。用户明确要求不自动合并时才设为关闭。

选择自托管时，再确认凭据方式和 Secret 名称；优先 GitHub App Token，允许最小权限的 `RENOVATE_TOKEN`，禁止普通文本或仓库文件中的明文 Token。

## Renovate 与 CI

按 `references/renovate-policy.md` 执行：

- 存在 Renovate 配置时合并而非整文件覆盖；不存在时创建根目录 `renovate.json`，并明确它必须进入默认分支后 Renovate 才能使用。
- 顶层使用 `rangeStrategy: "bump"`，使直接依赖升级同步提升 `package.json` 范围；纯传递依赖没有 manifest 声明时允许只更新锁文件。
- 使用稳定英文 `groupSlug: "all-non-major"`，分别设置非重大与 major 的 `automerge`。
- 不把 `rangeStrategy` 和 `matchUpdateTypes` 放入同一个 package rule。
- 使用 PR 自动合并、GitHub 平台自动合并、测试门禁和陈旧分支清理。
- 创建或补全稳定名称为 `verify` 的 CI，运行冻结安装和项目已有的有效 lint、typecheck、test/coverage、build、docs/example build。
- 排除 dev、watch、fix、release、publish、deploy 等交互式或有副作用命令。
- 没有有效项目检查或验证失败时，将所有 Renovate automerge 保持为 `false` 并要求用户提供检查命令。
- 自托管必须使用固定完整 SHA 的官方 Action 和 Actions Secret；不得使用普通 `GITHUB_TOKEN` 作为 Renovate 凭据。

完成后运行严格 Renovate 校验、workflow 语法检查、CI 中的实际命令、`git diff --check` 和凭据扫描。任何验证失败都先阻止自动合并，不继续写 GitHub Settings。

## 浏览器配置与 Renovate 激活

本地验证通过且仓库 URL 已确认后：

- 加载并遵循 `$browser:control-in-app-browser`；Codex 不使用外部 Playwright 或其他浏览器工具替代。
- 先读取当前仓库 Settings，再按 `references/github-settings.md` 输出写入前确认清单。
- 用户确认后，先配置 Allow auto-merge、Automatically delete head branches、默认分支 Ruleset，以及自托管模式需要的 Secret。
- Ruleset 必须要求 `verify` 成功且分支保持最新，不给 Renovate bypass 权限。
- required approvals 大于 0 时单独确认是否降为 0；未明确同意则保留并说明无人值守自动合并不可用。
- 仓库 Settings 处理完成后，检查 Mend Renovate GitHub App 是否已安装、是否正常启用、是否拥有目标仓库访问权。
- App 未安装时尝试通过浏览器安装；产品必须选择 `Renovate Only`，不要选择需要额外商业许可证的 `Mend Application Security`。
- 模式必须选择 `Scan and Alert`；不要选择静默且不会创建依赖更新 PR 的 `Scan Only`。
- App 已安装但未授权目标仓库时，进入 Installed GitHub Apps 的 Renovate 配置，为当前仓库追加 Repository access；不得顺带授权其他仓库。
- 安装或追加授权需要组织 Owner 批准时，停止自动点击，记录审批要求并输出 Owner 的手动操作路径。
- 完成后检查默认分支配置、Onboarding PR、Dependency Dashboard、Mend Job 或首个依赖 PR，至少获得一项可验证的 Renovate 激活证据后才报告接入成功。
- 自托管模式不要求安装 Mend App，但必须检查工作流、Secret、目标仓库权限和一次成功 Renovate Job。
- 登录受阻时明确要求用户在当前浏览器登录并告知已就绪；用户未继续也要输出手动步骤。

## 最终输出

始终输出：

- 仓库、默认分支、包管理器、接入方式和 major/非重大策略。
- 新增或修改文件、`verify` 的实际命令及验证结果。
- 浏览器每个页面的路径、原值、目标值和执行结果。
- Renovate App 安装状态、产品选择、运行模式、目标仓库授权状态和激活证据。
- 未完成项、失败原因和安全阻塞。
- 用户可逐项复现的 GitHub App、Secrets、Pull Requests 和 Ruleset 手动操作过程。
- 闭环结论：Renovate 安装或自托管执行器、目标仓库授权、默认分支配置、激活证据、automerge、CI `verify`、Ruleset required check、Allow auto-merge 和自动删除分支是否全部有效。

## 按需参考

- Renovate、包管理器、CI 与自托管策略：`references/renovate-policy.md`
- GitHub 浏览器设置、确认清单和结果模板：`references/github-settings.md`
- Codex、Claude Code、Cursor 适配差异：`agents/adapters.md`