# 17. 用户 MCP 配置 (User MCP Configuration)

## 1. 功能概述
用户现在可以在全局设置中配置自己的 MCP (Model Context Protocol) 协议或自定义指令。这些配置将被系统自动注入到每一次 AI 对话的 System Prompt 中，从而实现个性化的 AI 行为控制。

## 2. 核心价值
- **个性化 AI**: 用户可以定义 AI 的角色（如“海盗”、“资深工程师”）或行为准则。
- **全局生效**: 配置一次，对所有新建的对话和项目生效。
- **灵活性**: 支持任意文本格式的 Prompt 注入。

## 3. 技术实现

### 3.1 数据库设计
在 `users` 表中新增了 `mcp_config` 字段：
```sql
ALTER TABLE users ADD COLUMN mcp_config TEXT;
```

### 3.2 后端逻辑
- **Server Actions**: `src/lib/actions/user.ts`
    - `getUserMcpConfig()`: 获取当前用户的配置。
    - `updateUserMcpConfig(config)`: 更新配置。
- **Prompt 注入**: `src/app/api/chat/route.ts`
    - 在 `runAgent` 函数中，通过 `getUserMcpConfig` 获取用户配置。
    - 将配置追加到 `systemPrompt` 中：
      ```typescript
      const systemPrompt = `...
      ${mcpConfig ? `\nIMPORTANT: The user has provided the following specific instructions (MCP Protocol) which you MUST follow:\n${mcpConfig}\n` : ''}`;
      ```

### 3.3 前端实现
- **设置页面**: `src/app/settings/page.tsx`
    - 提供一个多行文本框供用户输入 MCP 配置。
    - 使用 Server Actions 进行数据的读取和保存。
- **入口**: 在用户头像下拉菜单 (`UserMenu`) 中增加了 "Settings" 选项。

## 4. 使用指南
1.  点击右上角用户头像，选择 **Settings**。
2.  在文本框中输入你的 MCP 配置或自定义 Prompt。
    - 示例: "你是一个资深 React 专家，请总是使用 TypeScript 编写代码，并优先使用 Tailwind CSS。"
3.  点击 **Save Changes** 保存。
4.  新建项目或开始新的对话，AI 将自动遵循你的配置。
