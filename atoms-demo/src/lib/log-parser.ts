import { AICallLog } from "./actions/message";
import { AgentNode, FileNode } from "./workspace-context";
import { FileItem } from "./actions/files";

function getAgentName(args: any): string {
    if (!args) return '子代理';
    const role = args.role || args.agent_role;

    const nameMap: Record<string, string> = {
        'Product Manager': '产品经理',
        'Frontend Developer': '前端开发',
        'Backend Developer': '后端开发',
        'Test Engineer': '测试工程师',
        'Sub-Agent': '子代理',
        'Sub-agent': '子代理'
    };

    if (args.name && nameMap[args.name]) {
        return nameMap[args.name];
    }

    if (args.name && args.name !== 'Sub-Agent' && args.name !== 'Sub-agent') {
        return args.name;
    }
    if (args.agent_name) {
        return args.agent_name;
    }

    const roleMap: Record<string, string> = {
        'product_manager': '产品经理',
        'frontend_developer': '前端开发',
        'backend_developer': '后端开发',
        'test_engineer': '测试工程师',
        'researcher': '研究员',
        'coder': '程序员',
        'critic': '代码审查员',
        'planner': '规划师'
    };

    if (role && roleMap[role]) {
        return roleMap[role];
    }

    return '子代理';
}

/**
 * Parses raw AI Call Logs into a list of AgentNodes for the Orchestration View.
 */
export function parseLogsToAgents(logs: AICallLog[]): AgentNode[] {
    const agents: Map<string, AgentNode> = new Map();

    // 1. Identify Agents from 'dispatch_subagent' calls
    logs.forEach(log => {
        if (log.step_type === 'tool_call' && log.metadata?.toolName === 'dispatch_subagent') {
            const args = log.metadata.args as any;
            const agentId = log.metadata.toolCallId || log.id;

            if (!agents.has(agentId)) {
                agents.set(agentId, {
                    id: agentId,
                    name: getAgentName(args),
                    role: args.role || args.agent_role || 'Assistant',
                    status: 'working', // Default to working when dispatched
                    currentTask: 'Initializing...',
                    avatar: undefined,
                    logs: [] // 初始化空日志数组
                });
            }
        }
    });

    // 2. 将日志关联到对应的 Agent
    // 规则：如果 log.parent_log_id 等于某个 agent 的 id (toolCallId)，则该日志属于该 agent
    logs.forEach(log => {
        // 跳过 dispatch_subagent 调用本身
        if (log.step_type === 'tool_call' && log.metadata?.toolName === 'dispatch_subagent') {
            return;
        }

        // 检查该日志是否属于某个子代理
        agents.forEach((agent, agentId) => {
            if (log.parent_log_id === agentId) {
                // 该日志属于此代理
                if (!agent.logs) {
                    agent.logs = [];
                }
                agent.logs.push(log);

                // 更新代理的当前任务（使用最新的 thinking 日志）
                if (log.step_type === 'thinking' && log.content) {
                    // 截取前100个字符作为当前任务
                    const taskPreview = log.content.substring(0, 100);
                    agent.currentTask = taskPreview.length < log.content.length
                        ? taskPreview + '...'
                        : taskPreview;
                }
            }
        });

        // 3. 检查 tool_result 来判断代理是否完成
        if (log.step_type === 'tool_result' && agents.has(log.metadata?.toolCallId)) {
            // 这是 dispatch_subagent 的结果 -> Agent 完成
            const agent = agents.get(log.metadata.toolCallId)!;
            agent.status = 'completed';
            agent.currentTask = 'Task completed';
        }
    });

    return Array.from(agents.values());
}

/**
 * Converts FileItems to FileNodes for the tree view
 */
export function parseFilesToTree(files: FileItem[]): FileNode[] {
    const root: FileNode[] = [];

    files.forEach(file => {
        // Simple flat mapping for now, assuming files list is already flat-ish or we don't need deep recursion yet
        // The previous FileExplorer handled flat lists.
        // We really should build a tree if paths have slashes.
        const parts = file.name.split('/');
        let currentLevel = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1 && file.type === 'file';
            const path = parts.slice(0, index + 1).join('/');

            let existingNode = currentLevel.find(n => n.name === part);

            if (!existingNode) {
                const newNode: FileNode = {
                    id: path, // Use path as ID
                    name: part,
                    type: isFile ? 'file' : 'directory',
                    children: isFile ? undefined : []
                };
                currentLevel.push(newNode);
                existingNode = newNode;
            }

            if (!isFile && existingNode.children) {
                currentLevel = existingNode.children;
            }
        });
    });

    return root;
}
