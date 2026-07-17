---
description: 为 GitHub Node.js 项目配置 Renovate、CI 必需检查和安全自动合并
argument-hint: <仓库地址或当前项目> [GitHub App|自托管] [major 自动合并:是|否]
---

按 `github-renovate-automation` Skill 处理以下输入：

<用户输入>
$ARGUMENTS
</用户输入>

执行要求：

- 先只读检查项目和 GitHub 信息，不直接覆盖现有 Renovate 或 CI 配置。
- 保留用户已明确的接入方式、非重大策略和 major 自动合并策略。
- 接入方式或 major 自动合并策略缺失时，必须先确认再修改文件。
- 非重大更新默认合并为一个 PR，并在有效 CI 成功后自动合并；用户明确拒绝时关闭。
- 没有 test、lint、typecheck、build 等有效项目检查时，保持所有 automerge 关闭并要求用户提供检查命令。
- 本地配置验证完成后，GitHub Settings 写操作前必须再次展示完整变更清单并确认。
- Codex 需要操作 GitHub UI 时调用 `$browser:control-in-app-browser`，不得改用外部 Playwright。
- 自托管不得直接使用普通 `GITHUB_TOKEN`，不得把 Token 写入文件或输出。
- 无论浏览器成功、失败、未登录、无权限或用户取消，最终都必须输出完整手动 GitHub Settings 配置过程。