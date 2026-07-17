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
3. Settings 完成后的 Renovate 检查
   - 检查 App 是否安装和启用
   - 检查目标仓库是否已授权
   - 缺失时安装或追加仓库授权
   - 产品选择 Renovate Only
   - 模式选择 Scan and Alert
```

用户未明确确认时不得保存任何远端设置，也不得安装 App 或扩大仓库授权范围。

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

用户选择自托管时，在仓库 Settings 完成阶段进入：

```text
Repository > Settings > Secrets and variables > Actions
```

创建用户确认的 Secret，例如 `RENOVATE_TOKEN`。只允许用户在安全输入框中自行提供值；不得读取、回显、截图、复制或记录 Secret。

使用 GitHub App 动态 Token 时，根据用户 App 配置创建必要的 ID/私钥 Secrets，并在 workflow 中使用当前受信任、固定 SHA 的 Token Action。不得把私钥写入仓库。

自托管不要求安装 Mend Renovate App。Settings 完成后改为检查工作流是否启用、Secret 是否存在、Token 是否有目标仓库权限，以及是否至少成功运行过一次 Renovate Job。

## Settings 完成后检查 Renovate 安装与授权

此阶段仅适用于用户选择 `Mend Renovate GitHub App`。仓库 Pull Request 和 Ruleset 设置处理完成后再执行。

### 1. 检查当前状态

检查并记录：

- Mend Renovate GitHub App 是否已安装到当前个人账户或组织。
- App 是否处于启用状态，而不是等待批准、暂停或被组织策略阻止。
- App 的 Repository access 是否包含准确的目标仓库。
- 默认分支是否已经包含有效 `renovate.json`，或是否存在待合并的 Configure Renovate/Onboarding PR。

不能因为仓库中存在 `renovate.json` 就假定 App 已安装，也不能因为 App 已安装就假定当前仓库已授权。

### 2. App 未安装时自动安装

在已获得用户 Settings 写入确认的前提下，尝试通过浏览器打开 Mend Renovate GitHub App 安装页面：

1. 选择正确的个人账户或组织。
2. Repository access 优先选择 `Only select repositories`，只勾选当前目标仓库。
3. 如果出现产品选择：
   - 必须选择 `Renovate Only`。
   - 不要选择 `Mend Application Security`，它需要额外的 Mend 商业许可证，也超出依赖自动更新范围。
4. 如果出现仓库模式选择：
   - 必须选择 `Scan and Alert`。
   - 不要选择 `Scan Only`；它是静默扫描，不会创建依赖更新 PR，无法形成 CI 和自动合并闭环。
5. 保存安装并记录页面返回的实际结果。

如果组织要求 Owner 审批，只提交或记录安装请求，不得假装已经安装成功；输出 Owner 需要完成的手动步骤。

### 3. App 已安装但仓库未授权时追加授权

根据仓库归属进入对应路径：

```text
个人账户：GitHub > Settings > Applications > Installed GitHub Apps > Renovate > Configure
组织账户：Organization > Settings > GitHub Apps / Installed GitHub Apps > Renovate > Configure
```

在 Repository access 中：

1. 保留现有授权。
2. 只追加当前目标仓库。
3. 不切换成 `All repositories`，除非用户另外明确同意。
4. 保存后重新读取页面，确认目标仓库确实出现在授权列表中。

如果没有配置权限，记录所需 Owner/Admin 角色和准确操作路径，不重复无效点击。

### 4. App 已安装且已授权时检查产品和模式

如果 Mend Developer Platform 可显示当前仓库产品或模式：

- 产品必须是 `Renovate Only`，不是 `Mend Application Security`。
- 模式必须允许 checks、issues 和 remediation PRs，当前界面可能显示为 `Scan and Alert`。
- `Scan Only` 必须视为未完成，因为它不会创建依赖更新 PR。

界面名称变化时按功能描述判断，在报告中记录实际名称，不盲目点击相似选项。

## Renovate 激活验证

安装或授权完成后，必须检查以下证据：

1. 目标仓库默认分支包含合法 Renovate 配置；或者 Hosted App 已创建 Configure Renovate/Onboarding PR。
2. Mend Developer Platform 中目标仓库存在且最近一次 Job 没有安装/授权类错误。
3. 至少观察到以下一项：
   - Configure Renovate/Onboarding PR；
   - Dependency Dashboard Issue；
   - 成功的 Renovate Job；
   - 首个依赖更新 PR。

只看到 App 安装成功页面不足以判定接入成功。没有激活证据时将结果标记为“已安装/已授权，但尚未验证运行”。

如果配置仅存在于本地未提交分支，明确说明必须先进入默认分支，Renovate 才能读取。

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
| Renovate App installed | ... | 是 | ... |
| Renovate repository access | ... | OWNER/REPO | ... |
| Mend product | ... | Renovate Only | ... |
| Repository mode | ... | Scan and Alert | ... |
| Renovate activation evidence | ... | Job/Dashboard/PR | ... |

### 未完成项与原因
- ...

### 用户手动检查步骤
1. 打开 Settings > General > Pull Requests，确认 Squash、Allow auto-merge 和自动删除分支。
2. 打开 Settings > Rules > Rulesets，确认规则目标为默认分支。
3. 确认 required check 精确为 `verify` 且要求分支保持最新。
4. 确认 Renovate 没有 bypass 权限。
5. 检查 Installed GitHub Apps 中 Renovate 已安装并包含目标仓库。
6. 检查 Mend 产品为 Renovate Only，仓库模式为 Scan and Alert。
7. 检查默认分支配置和 Renovate Job、Dependency Dashboard 或依赖 PR。
8. 打开 Renovate PR，确认 CI 成功后进入自动合并队列。
9. 合并后确认 Renovate 分支已删除。

### 闭环结论
- Renovate App/自托管执行器：通过/阻塞
- 目标仓库授权：通过/阻塞
- Renovate 配置位于默认分支：通过/阻塞
- Renovate 激活证据：通过/阻塞
- Renovate automerge：通过/阻塞
- CI verify：通过/阻塞
- Ruleset required check：通过/阻塞
- Allow auto-merge：通过/阻塞
- 自动删除分支：通过/阻塞
```

浏览器完全不可用时也必须给出上述页面路径、产品和模式选择、目标值、依赖顺序及阻塞原因。

官方参考：

- https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party
- https://docs.github.com/en/apps/using-github-apps/modifying-a-github-app-installation
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets