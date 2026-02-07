import { AICallLog } from "./actions/message";
import { AgentNode, FileNode } from "./workspace-context";
import { FileItem } from "./actions/files";

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

            // Check if agent already exists (maybe initialized earlier)
            if (!agents.has(agentId)) {
                agents.set(agentId, {
                    id: agentId,
                    name: args.name || args.agent_name || 'Sub-Agent',
                    role: args.role || args.agent_role || 'Assistant',
                    status: 'working', // Default to working when dispatched
                    currentTask: 'Initializing...',
                    avatar: undefined
                });
            }
        }
    });

    // 2. Update Status based on children/subsequent logs
    // We need to build a hierarchy or just map logs to their parents
    // Use a map for quick lookup
    const logMap = new Map(logs.map(l => [l.id, l]));
    const toolIdToAgentId = new Map(logs.filter(l => l.metadata?.toolCallId).map(l => [l.metadata.toolCallId, l.id])); // Map toolCallId to dispatch log ID ?? No.

    // Better approach:
    // If a log has a 'parent_log_id' which corresponds to a 'dispatch_subagent' tool call, 
    // then this log belongs to that agent.

    // Find logs that are children of agents
    logs.forEach(log => {
        // If parent is an agent dispatch (we need to track toolCallIds of dispatches)
        // Actually, log.parent_log_id usually links to the *step* that spawned it.
        // For sub-agents, the 'dispatch_subagent' tool call has a toolCallId. 
        // The sub-agent's activities might be linked to that toolCallId?
        // Or simply checking if the log's parent is the dispatch log.

        // Simplified Logic for MVP:
        // We assume flat list of agents for now, or just look for specific patterns.
        // Let's iterate and see if we can find "results" for the dispatch.

        if (log.step_type === 'tool_result' && agents.has(log.metadata?.toolCallId)) {
            // This is the result of the dispatch_subagent call -> Agent finished
            const agent = agents.get(log.metadata.toolCallId)!;
            agent.status = 'completed';
            agent.currentTask = 'Task completed';
        }

        // How to find "Current Task"?
        // If we can link a 'thinking' or 'tool_call' step to the agent.
        // This requires accurate parent-child tracking which might be complex with just the list.
        // For now, let's just show the agents found.
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
