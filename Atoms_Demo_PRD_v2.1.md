# 产品需求文档 (PRD): Atoms Demo (Website Builder Ver.)

> **版本**: v2.2 (Extended Features & Persistence)
> **方向**: Generative UI / Website Builder
> **核心价值**: 对话即生成，生成即部署。

## 1. 项目概况

### 1.1 核心目标
构建一个 **AI 网站构建器**。用户通过自然语言对话（如“做一个咖啡店的落地页”），系统实时生成可运行的网页代码，并提供在线预览和一键发布功能。

### 1.2 关键特性
1.  **Text-to-Website**: 输入想法，输出完整网页。
2.  **Multi-LLM Collaboration**: 模拟多模型/多角色协同工作（如产品经理、设计师、程序员），并**实时展示其实施状态**。
3.  **Instant Deployment**: 一键保存并生成独立链接。
4.  **Simple Auth**: 极简的登录/注册流程，无任何校验。
5.  **Conversational Iteration**: 支持多轮对话迭代（如“把按钮改大一点”、“换成蓝色风格”），实现真正的 Vibe Coding 体验。

## 2. 功能范围 (Scope)

### 2.1 基础链路 (P0)
1.  **首页/工作台**: 
    *   大输入框，用户输入 Prompt。
2.  **极简认证 (Simple Auth)**:
    *   **直接登录/注册**：提供账号/密码输入框。
    *   **无校验**：不验证邮箱格式、不验证密码强度。输入任何非空字符即可进入。
3.  **生成引擎 (Multi-Agent/LLM)**: 
    *   **状态预览 (Status Preview)**: 界面上清晰展示当前正在工作的 Agent/Model（例如：GPT-4 正在规划，Claude 3 正在写代码）。
    *   **实时反馈**: 用户可以看到 "Thinking...", "Designing...", "Coding..." 等状态流转。
    *   最终输出包含 HTML/Tailwind/JS 的完整组件代码。
4.  **部署/发布**:
    *   用户点击“Publish”，系统将当前代码快照保存。
    *   生成唯一 URL (e.g., `/share/xyz123`)。

### 2.2 扩展能力 (Extended Features)
1.  **Iterative Refinement (多轮对话迭代)**:
    *   **Chat to Modify**: 用户可以在预览后继续输入 Prompt，系统基于当前代码进行修改（Diff Update 或 全量替换）。
    *   **Context Awareness**: 包含对历史对话的上下文理解。
2.  **User Dashboard (项目看板)**:
    *   **My Projects**: 登录用户可以看到自己历史生成的项目列表。
    *   **Manage**: 支持删除或通过链接重新进入编辑。
3.  **Code View (代码视图)**:
    *   提供 "Preview" 和 "Code" 切换，展示生成的 HTML/CSS 代码，增加开发者友好度。

## 3. 用户流程 (User Flow)

1.  **Input**: 用户在首页输入 "帮我写一个贪吃蛇游戏"。
2.  **Auth (如未登录)**: 弹出极简登录框 -> 用户输入 admin/123 -> 直接通过。
3.  **Multi-Agent Generation**: 
    *   界面显示 **Status Dashboard**。
    *   *Step 1*: "Product Manager (GPT-4) is analyzing requirements..."
    *   *Step 2*: "UI Designer (Claude 3.5) is creating layout..."
    *   *Step 3*: "Frontend Dev (DeepSeek) is generating code..."
    *   用户可以看到这些状态依次变亮或滚动。
4.  **Preview**: 
    *   代码生成完毕，右侧 iframe 自动渲染出贪吃蛇游戏。
5.  **Refine & Deploy**: 
    *   用户满意后点击 "Deploy"，获得分享链接。
6.  **Dashboard (Optional)**:
    *   用户点击右上角头像进入“我的项目”，查看历史记录。

## 4. 技术挑战与方案 (Technical Strategy)

### 4.1 代码生成格式
*   **方案**: 单文件 HTML (包含 Tailwind CDN)。

### 4.2 多模型协作模拟 (Multi-LLM Simulation)
*   为了演示效果，可以采用 **串行调用** 或 **模拟并行**。
*   **API 设计**: 后端可以分步返回状态 (`{ status: 'designing', by: 'claude-3-opus' }`)，前端展示进度条或状态卡片。
*   **Fallback**: 如果无法同时调用多个昂贵的模型，可以使用同一个模型扮演不同角色（System Prompt 区分），但在 UI 上展示为不同的 Agent 在工作。

### 4.3 部署实现
*   **"部署"** = 将当前的 HTML 字符串保存到数据库的 `Site` 表。
*   **"访问"** = 动态路由 `/share/[id]` 读取并渲染。

### 4.4 数据持久化 (Data Persistence)
*   **目标**: 满足“具备数据持久化”要求，并支持多用户隔离。
*   **Schema 设计**:
    *   `User`: `{ id, username, password(plain), created_at }`
    *   `Project`: `{ id, user_id, name, current_code, prompt_history: [], created_at, updated_at }`
    *   `Deployment`: `{ id, project_id, share_token, snapshot_code }`
*   **存储方案**: 本地 SQLite 或 JSON 文件存储（MVP阶段），或轻量级云数据库（如 Vercel KV / Mongo Atlas）。本次优先使用 **SQLite** 以确保本地运行稳定性。

## 5. 交付清单
1.  **Landing Page**: 极简输入框。
2.  **Builder Page**: 左侧对话 + 顶部/悬浮状态栏 + 右侧预览。
3.  **Login Modal**: 无校验登录框。
4.  **Published Page**: 纯净展示页。
5.  **Implementation Doc**: 简要说明文档（实现思路、取舍、未来计划）。
