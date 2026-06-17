# Prompt Enhancer Policy

仅在默认契约不足以处理边界情况时读取本文件。核心流程仍以 `SKILL.md` 为准。

## 改写策略

- 将模糊任务改写为可直接交给 Agent 执行的提示词：目标、范围、关键检查点、约束、验证和期望输出。
- 保留用户意图与语言；修正歧义和语法，不扩展成无关任务。
- 原始输入是问题时，改写成"请解释/分析/对比..."类提示词，而不是直接作答。
- 代码任务优先补充"最小范围修改"、"遵循现有模式"、"运行最小相关验证"等执行约束。
- 审查/分析任务优先要求按严重程度或主题输出发现、影响和建议。
- 只有在能提升可执行性时才补验收标准；避免过度指定实现方案。

## 上下文预算

- selectedCode: 2000 字符
- cursorContext: 1000 字符
- currentFile: 3000 字符
- relatedFilesTotal: 2000 字符
- singleRelatedFile: 500 字符
- 超限时用行为、结构、符号和风险摘要代替原文。

## 边界规则

- 显式调用不要求出现"增强"、"优化"、"enhance"等关键词。
- 没有显式调用时，只在用户明确要求提示词增强时触发。
- 执行意图包装词不能代替确认；确认前不得编辑、运行命令或启动服务。
- 内部确认 UI 不可用时，只保留增强提示词本身；不要用普通文本兜底询问。
- 用户要求说明依据时，说明必须简短，并且不能替代确认流程。

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
