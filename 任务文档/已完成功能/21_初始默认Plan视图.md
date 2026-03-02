# 初始默认Plan视图功能实现

## 1. 需求背景
每个项目初始进入时，默认应该展示为 "Plan"（计划）页面，而非 "Code"（代码）编辑器页面，以便用户首先看到或进行项目规划，符合项目管理的逻辑直觉。

## 2. 功能修改内容
### 2.1 修改工作区全局状态
**修改文件**：`src/lib/workspace-context.tsx`
将工作区上下文的初始状态 `initialState` 中 `mode` 字段的默认值，从 `'EDITING'`（对应代码编辑模式）更改为了 `'PLANNING'`（对应 Plan 计划模式）。

由于 React 树在下发此 Context 状态时会自动驱动 `<WorkspacePanel>` 中的 `<OrchestrationView />` （而不是原本的 `<EditorView />`）和 `mode === 'PLANNING'` 状态的样式渲染，此修改一步到位地将所有新建项目进入以及从Dashboard点入时的默认行为全量切换至了“Plan”首选策略。

### 2.2 验证结果
项目打开后，Tab 切换默认停留在 "Plan" 页面，不再是默认处于 "Code" 视角。

## 3. 部署动作
即将通过 `/Users/aaa/Documents/study-demo/atoms-demo/deploy.sh` 脚本统一部署到远程。
