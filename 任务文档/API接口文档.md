# 项目 API 接口文档

本文档详细说明了 Atoms Demo 项目中的 API 接口和 Server Actions。

## 1. 认证接口 (Auth)

位于 `src/app/api/auth` 目录。

### 1.1 登录
- **路径**: `/api/auth/login`
- **方法**: `POST`
- **描述**: 用户通过用户名和密码登录。
- **请求体**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **响应**:
  - 成功 (200): 返回用户信息和会话信息。
  - 失败 (400/401/500): 返回错误信息。
- **说明**: 登录成功后会设置 HttpOnly Cookie。会自动尝试修复 `public.users`表中缺失的用户数据。

### 1.2 注册
- **路径**: `/api/auth/register`
- **方法**: `POST`
- **描述**: 注册新用户。
- **请求体**:
  ```json
  {
    "username": "string",
    "password": "string",
    "email": "string" // 可选，默认生成 username@atoms.demo
  }
  ```
- **响应**:
  - 成功 (201): 返回注册成功的用户信息。
  - 失败 (400/500): 返回错误信息。
- **说明**: 注册时会同步在 `public.users` 表中创建记录。

### 1.3 获取当前用户
- **路径**: `/api/auth/me`
- **方法**: `GET`
- **描述**: 获取当前登录用户的详细信息。
- **响应**:
  - 成功 (200): 返回 `user` 对象。
  - 失败 (401): 未登录。

### 1.4 登出
- **路径**: `/api/auth/logout`
- **方法**: `POST`
- **描述**: 退出登录，清除 Session Cookie。
- **响应**:
  - 成功 (200): 登出成功。

---

## 2. 业务 API (API Routes)

位于 `src/app/api` 目录。

### 2.1 AI 对话
- **路径**: `/api/chat`
- **方法**: `POST`
- **描述**: 与 AI 模型进行流式对话，用于生成 React 组件代码。
- **请求体**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "..." },
      ...
    ]
  }
  ```
- **响应**: 文本流 (Text Stream)。
- **说明**: 使用 Vercel AI SDK (`streamText`)，后端调用 Google Gemini 模型 (通过 OpenRouter)。

### 2.2 发布项目
- **路径**: `/api/publish`
- **方法**: `POST`
- **描述**: 将当前项目代码发布为公开分享链接。
- **请求体**:
  ```json
  {
    "projectId": "string", // 可选，若为空则创建新项目
    "code": "string"      // 必需，代码内容
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "shareUrl": "...",
    "token": "...",
    "deploymentId": "..."
  }
  ```
**说明**: 生成唯一的 `share_token` 并保存部署记录。

### 2.3 文件管理
- **路径**: `/api/files/[projectId]`
- **方法**: `GET`, `POST`, `DELETE`
- **描述**: 管理项目的文件资源。
- **响应**:
  - 成功 (200): 返回文件列表或操作结果。
  - 失败 (400/500): 返回错误信息。

### 2.4 消息管理
- **路径**: `/api/messages/[projectId]`
- **方法**: `GET`, `POST`, `DELETE`
- **描述**: 获取或管理项目的消息历史。
- **响应**:
  - 成功 (200): 返回消息列表或操作结果。
  - 失败 (400/500): 返回错误信息。

### 2.5 项目管理
- **路径**: `/api/projects`
- **方法**: `GET`, `POST`, `PUT`, `DELETE`
- **描述**: 项目的增删改查操作。
- **请求体**:
  ```json
  {
    "projectId": "string", // 可选
    "name": "string",       // 可选
    "code": "string"        // 可选
  }
  ```
- **响应**:
  - 成功 (200): 返回项目信息或操作结果。
  - 失败 (400/500): 返回错误信息。

---

## 3. Server Actions

位于 `src/lib/actions` 目录，用于 React 组件中直接调用的服务端函数。

### 3.1 项目管理 (`project.ts`)

| 函数名 | 参数 | 返回值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`getProjects`** | 无 | `Promise<Project[]>` | 获取当前用户的所有项目，按更新时间倒序。 |
| **`getProjectById`** | `id: string` | `Promise<Project \| null>` | 获取指定 ID 的项目详情。 |
| **`createProject`** | `name: string` (默认 "Untitled Project") | `Promise<string>` | 创建新项目，返回项目 ID。 |
| **`updateProjectCode`** | `id: string`, `code: string` | `Promise<void>` | 更新项目的代码内容。 |
| **`updateProjectName`** | `id: string`, `name: string` | `Promise<void>` | 更新项目名称。 |
| **`deleteProject`** | `id: string` | `Promise<void>` | 删除项目及其相关数据。 |

**Project 类型定义**:
```typescript
interface Project {
    id: string
    user_id: string
    name: string
    description: string | null
    current_code: string
    prompt_history: unknown[]
    status: 'draft' | 'generating' | 'published'
    created_at: string
    updated_at: string
}
```

### 3.2 消息管理 (`message.ts`)

| 函数名 | 参数 | 返回值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`getMessagesByProjectId`** | `projectId: string` | `Promise<Message[]>` | 获取项目的所有消息历史。 |
| **`saveMessage`** | `projectId: string`, `role: string`, `content: string` | `Promise<string \| null>` | 保存单条消息，返回消息 ID。 |
| **`saveMessages`** | `projectId: string`, `messages: Array<{role, content}>` | `Promise<void>` | 批量保存消息。 |

**Message 类型定义**:
```typescript
interface Message {
    id: string
    project_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    agent_name: string | null
    status: 'pending' | 'processing' | 'completed' | 'error'
    created_at: string
}
```

## 4. 数据库依赖

所有接口均依赖 Supabase 进行数据持久化。
- **Users**: 存储用户信息 (`public.users`)。
- **Projects**: 存储项目数据 (`public.projects`)。
- **Messages**: 存储聊天记录 (`public.messages`)。
- **Deployments**: 存储发布记录 (`public.deployments`)。
