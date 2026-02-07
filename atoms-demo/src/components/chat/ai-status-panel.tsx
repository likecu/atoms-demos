"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Brain,
    Terminal,
    FileText,
    CheckCircle2,
    ChevronRight,
    ChevronDown,
    Clock,
    Bot,
    Network,
    LayoutGrid,
    Maximize2,
    Minimize2
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { type AICallLog } from '@/lib/actions/message'
import { cn } from '@/lib/utils';

/**
 * Extract filename from tool call arguments
 */
function extractFileFromArgs(metadata: any): string | null {
    if (!metadata?.args) return null;

    const args = metadata.args;
    // Check common file argument names
    return args.TargetFile || args.path || args.file || args.AbsolutePath || null;
}

// --- Types ---

interface ExecutionFlowProps {
    logs: AICallLog[]
}

type LogNode = AICallLog & {
    children: LogNode[]
    depth: number
    // Helper boolean to identify if this node represents a Sub-agent usage (the initial dispatch tool call)
    isSubAgentDispatch?: boolean
}

// --- Logic: Tree Construction ---

/**
 * 构建日志树
 */
function buildLogTree(logs: AICallLog[]): LogNode[] {
    const nodeMap = new Map<string, LogNode>();
    const toolCallIdMap = new Map<string, LogNode>();
    const rootNodes: LogNode[] = [];

    // 1. 初始化所有节点
    logs.forEach(log => {
        const isDispatch = log.step_type === 'tool_call' && log.metadata?.toolName === 'dispatch_subagent';
        const node: LogNode = {
            ...log,
            children: [],
            depth: 0,
            isSubAgentDispatch: isDispatch
        };
        nodeMap.set(log.id, node);

        // 如果日志包含 toolCallId，记录到映射中
        if (log.metadata?.toolCallId) {
            toolCallIdMap.set(log.metadata.toolCallId, node);
        }
    });

    // 2. 构建树结构
    // 按时间顺序处理
    logs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    logs.forEach(log => {
        const node = nodeMap.get(log.id)!;
        let parent: LogNode | undefined;

        // 尝试通过 parent_log_id 查找父节点 (标准 ID 链接)
        if (log.parent_log_id && nodeMap.has(log.parent_log_id)) {
            parent = nodeMap.get(log.parent_log_id);
        }
        // 尝试通过 parent_log_id 作为 toolCallId 查找父节点 (子代理链接)
        else if (log.parent_log_id && toolCallIdMap.has(log.parent_log_id)) {
            parent = toolCallIdMap.get(log.parent_log_id);
        }

        if (parent) {
            node.depth = parent.depth + 1;
            parent.children.push(node);
        } else {
            rootNodes.push(node);
        }
    });

    return rootNodes;
}

// --- Components ---

/**
 * Execution Flow Component (formerly AIStatusPanel)
 */
export function AIStatusPanel({ logs }: ExecutionFlowProps) {
    const [selectedLog, setSelectedLog] = useState<AICallLog | null>(null)

    // 使用 useMemo 缓存树结构计算
    const logTree = useMemo(() => buildLogTree(logs), [logs]);

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 p-8">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center animate-pulse">
                    <Brain className="w-6 h-6 text-zinc-600" />
                </div>
                <div className="text-center space-y-1">
                    <p className="font-medium text-zinc-300">暂无实时执行数据</p>
                    <p className="text-xs">发送消息后，AI 的思考和工具调用过程将显示在这里</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
            {/* Main Flow Area */}
            <div className="flex-1 flex flex-col border-r border-zinc-800">
                <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Execution Flow</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">LIVE</span>
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="flex flex-col gap-4 pb-10">
                        {/* Render Top Level Nodes */}
                        <NodeList
                            nodes={logTree}
                            onSelect={setSelectedLog}
                            selectedId={selectedLog?.id}
                        />
                    </div>
                </ScrollArea>
            </div>

            {/* Detail Sidebar */}
            <AnimatePresence>
                {selectedLog && (
                    <LogDetailPanel
                        selectedLog={selectedLog}
                        onClose={() => setSelectedLog(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/**
 * Renders a list of nodes. Handling grouping for parallel sub-agents.
 */
function NodeList({ nodes, onSelect, selectedId }: { nodes: LogNode[], onSelect: (log: AICallLog) => void, selectedId?: string }) {
    if (!nodes || nodes.length === 0) return null;

    const items: React.ReactNode[] = [];
    let currentParallelGroup: LogNode[] = [];

    const flushParallelGroup = () => {
        if (currentParallelGroup.length > 0) {
            items.push(
                <SubAgentGrid key={`grid-${currentParallelGroup[0].id}`} nodes={currentParallelGroup} onSelect={onSelect} selectedId={selectedId} />
            );
            currentParallelGroup = [];
        }
    };

    // Extract file activities for highlighting
    const fileActivities = nodes
        .filter(n => n.step_type === 'tool_call')
        .map(n => {
            const fileName = extractFileFromArgs(n.metadata);
            if (!fileName) return null;
            const toolName = n.metadata?.toolName || '';
            if (['write_to_file', 'replace_file_content', 'multi_replace_file_content', 'create_or_update_file'].includes(toolName)) {
                return { fileName, toolName, agent: n.agent_label || 'Agent' };
            }
            return null;
        })
        .filter(Boolean);

    nodes.forEach((node) => {
        if (node.isSubAgentDispatch) {
            // Add to parallel group
            currentParallelGroup.push(node);
        } else {
            // Standard node, flush any accumulated parallel group first
            flushParallelGroup();
            items.push(
                <LogItem key={node.id} node={node} onSelect={onSelect} selectedId={selectedId} />
            );
        }
    });

    // Flush remaining
    flushParallelGroup();

    return (
        <div className="flex flex-col gap-2">
            {fileActivities.length > 0 && (
                <FileActivityBanner activities={fileActivities as any} />
            )}
            {items}
        </div>
    );
}

/**
 * File Activity Banner - Shows prominent indicator when files are being edited
 */
function FileActivityBanner({ activities }: { activities: Array<{ fileName: string, toolName: string, agent: string }> }) {
    if (activities.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-lg p-3 mb-2"
        >
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <div className="flex-1">
                    <p className="text-xs font-semibold text-purple-300">文件更新中</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {activities.map((activity, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 font-mono border border-purple-500/30">
                                {activity.fileName.split('/').pop()}
                            </span>
                        ))}
                    </div>
                </div>
                <FileText className="w-4 h-4 text-purple-400" />
            </div>
        </motion.div>
    );
}



/**
 * Grid Container for Sibling Sub-agents
 */
function SubAgentGrid({ nodes, onSelect, selectedId }: { nodes: LogNode[], onSelect: (log: AICallLog) => void, selectedId?: string }) {
    return (
        <div className="my-2 pl-2 border-l-2 border-dashed border-zinc-800">
            <div className="flex items-center gap-2 mb-2 px-1">
                <Network className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    {nodes.length > 1 ? 'Parallel Execution' : 'Sub-agent Execution'}
                </span>
            </div>

            <div className={`grid gap-3 ${nodes.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {nodes.map(node => (
                    <AgentCard key={node.id} node={node} onSelect={onSelect} selectedId={selectedId} />
                ))}
            </div>
        </div>
    )
}


/**
 * Card Component for a Sub-agent
 */
function AgentCard({ node, onSelect, selectedId }: { node: LogNode, onSelect: (log: AICallLog) => void, selectedId?: string }) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Extract Agent Role from args if possible
    let agentRole = "Sub-agent";
    try {
        if (node.metadata?.args && (node.metadata.args as any).agent_role) {
            agentRole = (node.metadata.args as any).agent_role;
        }
    } catch (e) { }

    // Determine Status
    const hasError = node.children.some(c => c.metadata?.error);
    const isCompleted = node.children.some(c => c.step_type === 'tool_result' && c.metadata?.toolCallId === node.metadata?.toolCallId);
    // Note: dispatch_subagent returns a simple success result wrapper, likely immediate, 
    // but the sub-agent execution logs are CHILDREN of this node.

    // If we want to check if the sub-agent *logic* inside is done, we might check for the last child being output?
    // But 'runAgent' returns text, which is saved as 'tool_result' of the dispatch call.
    // So if 'tool_result' exists in children (linked by parent_log_id=toolCallId), then it's done.

    const statusColor = hasError ? 'text-red-400 bg-red-500/10' :
        isCompleted ? 'text-emerald-400 bg-emerald-500/10' :
            'text-purple-400 bg-purple-500/10';

    return (
        <div className={`
            flex flex-col rounded-xl border transition-all duration-200 overflow-hidden bg-zinc-900/40
            ${selectedId === node.id ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-zinc-800 hover:border-zinc-700'}
        `}>
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-zinc-900/60 cursor-pointer border-b border-zinc-800/50 group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${statusColor}`}>
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                            {agentRole.toUpperCase()}
                            {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            ID: {node.metadata?.toolCallId?.slice(0, 8) || 'Unknown'}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
            </div>

            {/* Body */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="p-3 bg-zinc-950/30 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {/* Render Children of the Sub-agent */}
                            <NodeList nodes={node.children} onSelect={onSelect} selectedId={selectedId} />

                            {node.children.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-6 text-zinc-600 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-zinc-700 animate-ping" />
                                    <span className="text-[10px] italic">Initializing agent environment...</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}


/**
 * Standard Log Item (Thought, Tool Call, Output)
 */
function LogItem({ node, onSelect, selectedId }: { node: LogNode, onSelect: (log: AICallLog) => void, selectedId?: string }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children.length > 0;

    // Icon Configuration
    const iconMap: Record<string, React.ReactNode> = {
        thinking: <Brain className="w-3.5 h-3.5 text-zinc-400" />,
        tool_call: <Terminal className="w-3.5 h-3.5 text-blue-400" />,
        tool_result: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        output: <FileText className="w-3.5 h-3.5 text-amber-400" />
    }

    const titleMap: Record<string, string> = {
        thinking: "Thinking",
        tool_call: "Tool Call",
        tool_result: "Result",
        output: "Response"
    }

    // Special handling for output/thinking content visualization
    const isThinking = node.step_type === 'thinking';
    const isTool = node.step_type === 'tool_call';
    const isResult = node.step_type === 'tool_result';

    // Hide 'dispatch_subagent' result if it's just the return value of the function (usually redundant with the Card state)
    // But we might want to keep it to see the "Result" of the dispatch (e.g. "Mission Accomplished").
    // Let's keep it but style it subtly.

    return (
        <div className="relative group">
            <motion.div
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                    relative flex flex-col gap-2 rounded-lg border p-3 transition-colors text-sm
                    ${selectedId === node.id
                        ? 'bg-zinc-800/80 border-zinc-700 shadow-lg'
                        : 'bg-zinc-900/20 border-zinc-800/50 hover:bg-zinc-900/40 hover:border-zinc-700/50'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                    if (hasChildren) setIsExpanded(!isExpanded);
                }}
            >
                {/* Header Row */}
                <div className="flex items-center gap-3">
                    <div className={`
                        flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center border
                        ${selectedId === node.id ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-900 border-zinc-800'}
                     `}>
                        {iconMap[node.step_type] || <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                            {node.metadata?.toolName || titleMap[node.step_type] || node.step_type}
                        </span>
                    </div>

                    {hasChildren && (
                        <div className="text-zinc-600">
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                    )}
                </div>

                {/* Content Parsing & Display */}
                <div className="pl-9">
                    {isThinking && (
                        <p className="text-zinc-400 text-xs leading-relaxed font-mono opacity-90 line-clamp-3 whitespace-pre-wrap">
                            {node.content}
                        </p>
                    )}

                    {isTool && (
                        <div className="font-mono text-[10px] text-zinc-400 bg-black/40 rounded px-2 py-1.5 border border-zinc-800/50 truncate">
                            {JSON.stringify(node.metadata?.args)}
                        </div>
                    )}

                    {isResult && (
                        <div className="font-mono text-[10px] text-zinc-500 bg-emerald-950/10 rounded px-2 py-1.5 border border-emerald-500/10 truncate">
                            Result: {node.content && node.content.length > 100 ? node.content.slice(0, 100) + '...' : (node.content || '')}
                        </div>
                    )}

                    {!isThinking && !isTool && !isResult && (
                        <p className="text-zinc-300 text-xs">
                            {node.content?.slice(0, 100)}
                        </p>
                    )}
                </div>
            </motion.div>

            {/* Children (Nested) */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-4 mt-2 border-l border-zinc-800 ml-3"
                    >
                        <NodeList nodes={node.children} onSelect={onSelect} selectedId={selectedId} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}


/**
 * Detail Panel (Right Sidebar)
 */
function LogDetailPanel({ selectedLog, onClose }: { selectedLog: AICallLog, onClose: () => void }) {
    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-[400px] bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-2xl h-full absolute right-0 top-0 bottom-0"
        >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-medium text-zinc-200">Log Details</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                    {/* Metadata Section */}
                    <div className="space-y-3">
                        <LabelSection title="Type" />
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/30">
                                {selectedLog.step_type}
                            </div>
                            {(selectedLog as any).agent_label && (
                                <div className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-mono border border-purple-500/30">
                                    {selectedLog.agent_label}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <LabelSection title="Timestamp" />
                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(selectedLog.created_at).toLocaleString()}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-3">
                        <LabelSection title="Content" />
                        <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                                {selectedLog.content || <span className="text-zinc-600 italic">No content</span>}
                            </pre>
                        </div>
                    </div>

                    {/* Raw Metadata */}
                    <div className="space-y-3">
                        <LabelSection title="Raw Metadata" />
                        <div className="rounded-lg border border-zinc-800 bg-black/40 p-3 overflow-x-auto">
                            <pre className="text-[10px] font-mono text-emerald-400/80">
                                {JSON.stringify(selectedLog.metadata, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </motion.div>
    )
}

function LabelSection({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-2 pb-1 border-b border-zinc-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</span>
        </div>
    )
}
