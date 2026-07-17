# Agent Adapters

各 Agent 使用相同安全契约：先只读检查，再明确接入方式和 major 自动合并策略；本地配置验证通过后才能进入 GitHub Settings；写入前必须再次确认；Settings 完成后检查 Renovate 安装和目标仓库授权，必要时安装或追加授权；浏览器不可用或失败时仍输出完整手动过程。

| Agent | 调用方式 | 确认与浏览器 | 备注 |
|---|---|---|---|
| Codex | `$github-renovate-automation <任务>` 或 `/github-renovate-automation <参数>` | 使用可用的内部确认 UI；GitHub UI 操作必须加载 `$browser:control-in-app-browser` | 不使用外部 Playwright、独立 Browser MCP 或搜索结果替代已登录浏览器 |
| Claude Code | `/github-renovate-automation <参数>` 或显式引用本 Skill | 使用宿主原生确认能力；有浏览器工具时按相同确认清单操作 | 无浏览器能力时停止远端写入并输出完整手动 Settings 步骤 |
| Cursor | 显式引用本 Skill 或兼容命令文件 | 使用可用的确认 UI；有浏览器能力时读取当前值后再修改 | 可利用当前 workspace 和 Git remote，不能假定用户拥有仓库管理员权限 |

## App 安装和授权统一契约

- GitHub App 模式在仓库 Settings 完成后检查 App 安装、启用状态和 Repository access。
- App 缺失时尝试安装；产品选择 `Renovate Only`，禁止选择需要额外商业许可证的 `Mend Application Security`。
- 模式选择 `Scan and Alert`，禁止将静默的 `Scan Only` 当作依赖更新接入完成。
- App 已安装但缺少目标仓库时只追加当前仓库；未经明确同意不得改成 All repositories。
- 组织审批受阻时停止远端写入，输出 Owner/Admin 的准确审批和授权步骤。
- 自托管模式不要求 Mend App，但必须验证 Secret 权限和至少一次成功 Renovate Job。
- 没有 Job、Onboarding PR、Dependency Dashboard 或依赖 PR 等激活证据时，不得报告接入成功。
## 统一失败处理

- 内部确认 UI 不可用：在 GitHub Settings 写入前用宿主允许的明确确认方式；无法取得确认则不执行远端写入。
- 浏览器未登录：要求用户在当前浏览器登录并告知已就绪，不切换到搜索或其他站点绕过登录。
- 浏览器不可用、权限不足或页面结构变化：记录实际失败位置，不猜测已成功，输出 `references/github-settings.md` 中的完整手动流程。
- 只完成部分设置：逐项标记成功、失败或未执行，并说明自动合并闭环是否仍被阻塞。
- Secret 输入：只允许用户在安全 Secret 输入框自行填写；不得读取、复制、回显、截图或记录 Secret 值。