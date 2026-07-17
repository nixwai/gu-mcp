# Prompt Enhancer Policy

仅在默认契约不足以处理边界情况时读取本文件。核心流程仍以 `SKILL.md` 为准。

## 改写策略

- 将模糊任务改写为可直接交给 Agent 执行的提示词：目标、范围、关键检查点、约束、验证和期望输出。
- 保留用户意图与语言；修正歧义和语法，不扩展成无关任务。
- 原始输入是问题时，改写成"请解释、分析或对比……"类提示词，而不是直接作答。
- 代码任务优先补充"最小范围修改"、"遵循现有模式"、"运行最小相关验证"等执行约束。
- 审查或分析任务优先要求按严重程度或主题输出发现、影响和建议。
- 只有在能提升可执行性时才补验收标准；避免过度指定实现方案。

## 上下文预算

- selectedCode: 2000 字符
- cursorContext: 1000 字符
- currentFile: 3000 字符
- relatedFilesTotal: 2000 字符
- singleRelatedFile: 500 字符
- 超限时用行为、结构、符号和风险摘要代替原文。

## 安全确认边界

- 第一可见动作必须是完整展示增强提示词；确认 UI、工具调用、任务执行、仓库扫描和前置 token 解析都必须排在它之后。
- 用户可能输错内容，增强过程也可能产生歧义、过度补全或语义偏移，因此增强结果必须由用户检查，不能把生成结果视为已授权任务。
- "增强后执行"等包装词只授权原始意图，不授权尚未生成的增强结果，不能代替展示后的明确确认。
- 唯一有效授权是用户在内部确认 UI 中明确选择执行；普通文本回复或原始输入中的执行措辞均不能替代。
- 用户拒绝、关闭确认 UI、确认结果不明确、内部确认 UI 不可用或无法调起时，只保留已经展示的增强提示词，不执行任务、不调用工具，也不输出失败说明。
- 用户要求说明依据时，说明必须简短，并排在完整增强提示词之后、确认阶段之前。

## 触发边界

- 显式调用不要求出现"增强"、"优化"、"enhance"等关键词。
- 没有显式调用时，只在用户明确要求提示词增强时触发。

## 嵌套指令兼容

- prompt-enhancer 只消费自己的调用标记；调用标记之后的 `$skill`、`@plugin`、`/command` 等前置特殊指令 token 属于原始提示词内容。
- 如果原始提示词开头有一个或多个连续前置 token，增强后必须按原顺序原样保留，例如 `$code-review @browser 检查页面问题` 仍应以 `$code-review @browser` 开头。
- 前置 token 在增强阶段不得被解析、执行、触发或替换；不要把 `$code-review` 改写成"请进行代码审查"而丢失调用语义。
- 只增强前置 token 之后的任务描述；如果后续信息过少，做保守补全，但仍保留 token。
- 只有增强提示词完整展示且用户明确确认执行后，宿主 Agent 才能处理保留的 token。

## 短示例

```text
输入：$prompt-enhancer 修复这个 bug
输出：请定位并修复当前代码中的 bug，先分析复现路径、相关文件、根因和影响范围，再实施最小范围修复，并运行对应测试或验证命令确认问题已解决。
```

```text
输入：$prompt-enhancer 插件和 Skill 有什么区别
输出：请清晰解释插件和 Skill 的区别与关系，从定义、触发方式、目录结构、资源能力、配置能力和使用入口进行对比，并结合 prompt-enhancer 举例说明。
```

```text
输入：$prompt-enhancer Fix flaky tests
输出：Please identify and fix the flaky tests, first determining whether the failures come from timing, shared state, test order, external dependencies, or incorrect assertions. Keep the fix narrowly scoped and run the smallest relevant test command to verify the failures are stable.
```

```text
输入：$prompt-enhancer $code-review 检查当前 diff
输出：$code-review 请对当前 diff 做一次代码审查，重点关注正确性、安全风险、行为回归和缺失测试，并按严重程度列出发现、影响和建议修复方式。
```

```text
输入：$prompt-enhancer @browser 打开 localhost:3000 检查页面
输出：@browser 请打开 localhost:3000，检查页面是否正常加载、主要交互是否可用，以及是否存在明显布局错位或文本重叠。
```
