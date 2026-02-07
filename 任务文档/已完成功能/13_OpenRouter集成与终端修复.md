# 13. OpenRouter集成与终端修复 (OpenRouter Integration & Terminal Fix)

> 完成时间: 2026-02-08

## 1. 背景与目标
为了支持更多样化的 AI 模型并解决 API 兼容性问题，我们需要集成 OpenRouter Provider。同时，在使用过程中发现前端终端无法显示 AI 执行的命令，且 AI 状态面板日志更新不及时，需要进行修复。

## 2. 核心变更

### 2.1 OpenRouter Provider 集成
- **依赖安装**: 引入 `@openrouter/ai-sdk-provider`。
- **Provider 重构**:
    - 在 `src/app/api/chat/route.ts` 中使用 `createOpenRouter` 替代标准 OpenAI Provider。
    - 更新 `tools.ts` 使用 `ai` SDK 的 `tool()` 函数定义，确保参数 schema 兼容性。
    - 实现了 `stopWhen` 和 `onStepFinish` 回调，支持多步工具调用（Thinking -> Tool Call -> Tool Result -> Output）。

### 2.2 沙盒环境上下文统一
- **问题**: 前端 Terminal 使用 `userId` 连接沙盒，而 AI 工具链路使用 `projectId` 连接沙盒，导致环境隔离（AI 创建的文件用户看不到）。
- **修复**:
    - 重构 `src/lib/actions/sandbox.ts` 中的 `execSandboxCommand` 和 `listWorkspaceFiles`，强制要求传入 `projectId`。
    - 更新 `TerminalPanel` 组件，将当前 `projectId` 传递给后端 Action。

### 2.3 日志与状态同步优化
- **问题**: 
    - `ChatPageClient` 轮询逻辑在 `processing` 状态结束后立即停止，导致最后生成的日志（如 `tool_result`）未被拉取。
    - `getAICallLogsByProjectId` 只查询最后一条消息的日志，当 Assistant Message 生成后，关联到 User Message 的 logs 就丢失了。
- **修复**:
    - 更新 `ChatPageClient`，在收到 Assistant Response 时强制执行最后一次日志拉取。
    - 修复 `useEffect` 中的语法错误。
    - 优化 `getAICallLogsByProjectId` 查询逻辑，始终获取最后一条 **User Message** 关联的日志，确保思考过程不丢失。

## 3. 验证结果
- **终端显示**: 经浏览器自动化测试验证，AI 执行的 `executeBash` 命令现在可以正确显示在前端 Terminal 面板中。
- **文件系统**: 用户在 Terminal 中执行 `ls` 可以看到 AI 创建的文件，证明环境已连通。
- **状态面板**: AI Status Panel 能够实时显示 Thinking 和 Tool Call 日志。

## 4. 后续计划
- 画布模式 (Canvas View) 重构，支持无限画布和可折叠详情面板。
