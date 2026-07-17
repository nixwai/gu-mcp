# GitHub Settings Policy

仅在本地 Renovate 和 CI 验证通过后读取。浏览器流程和失败处理以 `SKILL.md`、`agents/adapters.md` 为准。

## 写入前确认

先读取当前值，再展示：

```text
目标仓库：OWNER/REPO
默认分支：DEFAULT_BRANCH
接入方式：GitHub App / 自托管
必需检查：verify
非重大自动合并：是/否
major 自动合并：是/否

计划修改：
1. Settings > General > Pull Requests
   - Allow squash merging: 开启
   - Allow auto-merge: 开启（仅有效 verify 已存在）
   - Automatically delete head branches: 开启
2. Settings > Rules > Rulesets > <目标规则>
   - Require a pull request before merging: 开启
   - Required approvals: 0 / 保持现值
   - Require status checks to pass: 开启
   - Required check: verify
   - Require branches to be up to date before merging: 开启
   - Restrict deletions: 开启
   - Block force pushes: 开启
   - Renovate bypass: 不添加
```

用户未明确确认时不得保存任何远端设置。

## Mend Renovate GitHub App

1. 打开 Renovate/Mend GitHub App 的安装或组织配置页面。
2. 确认组织和目标仓库，优先只授权指定仓库。
3. 出现产品选择时选择 `Renovate Only`。
4. 出现扫描模式时选择能够创建 checks、issues 和 remediation PRs 的模式；当前界面可能显示为 `Scan and Alert`。不要选择不会创建 PR 的 `Scan Only`。
5. 完成授权后检查 Dependency Dashboard 或 onboarding PR。
6. 不在用户未确认的其他仓库启用 Renovate。

界面名称变化时按功能描述判断，在报告中记录实际名称，不盲目点击相似选项。

## Pull Request 设置

路径：

```text
Repository > Settings > General > Pull Requests
```

目标：

- `Allow squash merging`：开启。
- `Allow auto-merge`：有效 `verify` 存在且用户策略需要自动合并时开启。
- `Automatically delete head branches`：开启。

保留项目需要的其他 merge methods，不关闭无冲突的既有保护。

## 默认分支 Ruleset

路径：

```text
Repository > Settings > Rules > Rulesets
```

优先更新已保护默认分支的 active ruleset，避免创建重叠规则。没有合适规则时才创建目标为默认分支的新 active ruleset。

目标：

- `Require a pull request before merging`：开启。
- `Required approvals`：无人值守自动合并需要 0；现值大于 0 时必须单独确认。
- `Allowed merge methods`：至少允许 Squash。
- `Require status checks to pass`：开启。
- Required check：选择 GitHub 已识别的实际 check `verify`，不要输入猜测名称。
- `Require branches to be up to date before merging`：开启。
- `Restrict deletions`：开启。
- `Block force pushes`：开启。
- Renovate bypass：不添加。

未经确认不得移除 approvals、部署检查、代码扫描或其他既有保护。

如果 `verify` 尚未运行，GitHub 可能无法在选择器中显示它。先推送 CI 并让它运行一次，再返回添加 required check；报告为待完成，不能假定成功。

## 自托管 Secret

路径：

```text
Repository > Settings > Secrets and variables > Actions
```

创建用户确认的 Secret，例如 `RENOVATE_TOKEN`。只允许用户在安全输入框中自行提供值；不得读取、回显、截图、复制或记录 Secret。

使用 GitHub App 动态 Token 时，根据用户 App 配置创建必要的 ID/私钥 Secrets，并在 workflow 中使用当前受信任、固定 SHA 的 Token Action。不得把私钥写入仓库。

## 最终报告

无论浏览器成功、失败或未执行，都输出：

```markdown
## GitHub Renovate 配置结果

- 仓库：OWNER/REPO
- 默认分支：DEFAULT_BRANCH
- 接入方式：...
- 必需检查：verify

| 页面/配置 | 原值 | 目标值 | 结果 |
|---|---|---|---|
| General > Allow auto-merge | ... | 开启/保持关闭 | 成功/失败/未执行 |
| General > Automatically delete head branches | ... | 开启 | ... |
| Ruleset > Require pull request | ... | 开启 | ... |
| Ruleset > Required approvals | ... | 0/保持 | ... |
| Ruleset > Required status checks | ... | verify | ... |
| Ruleset > Up to date before merging | ... | 开启 | ... |
| Ruleset > Restrict deletions | ... | 开启 | ... |
| Ruleset > Block force pushes | ... | 开启 | ... |

### 未完成项与原因
- ...

### 用户手动检查步骤
1. 打开 Settings > General > Pull Requests，确认 Squash、Allow auto-merge 和自动删除分支。
2. 打开 Settings > Rules > Rulesets，确认规则目标为默认分支。
3. 确认 required check 精确为 `verify` 且要求分支保持最新。
4. 确认 Renovate 没有 bypass 权限。
5. 打开 Renovate PR，确认 CI 成功后进入自动合并队列。
6. 合并后确认 Renovate 分支已删除。

### 闭环结论
- Renovate automerge：通过/阻塞
- CI verify：通过/阻塞
- Ruleset required check：通过/阻塞
- Allow auto-merge：通过/阻塞
- 自动删除分支：通过/阻塞
```

浏览器完全不可用时也必须给出上述页面路径、目标值、依赖顺序和阻塞原因。

官方参考：

- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets