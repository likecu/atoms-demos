"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Brain,
    Terminal,
    FileText,
    Folder,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Clock
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { type AICallLog } from '@/lib/actions/message'

interface AIStatusPanelProps {
    logs: AICallLog[]
}

/**
 * AI 状态监控面板
 * 以流程流的形式展示 AI 的中间执行步骤
 */
export function AIStatusPanel({ logs }: AIStatusPanelProps) {
    const [selectedLog, setSelectedLog] = useState<AICallLog | null>(null)

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
        <div className="flex h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
            {/* 左侧流程流 */}
            <div className="flex-1 flex flex-col border-r border-zinc-800">
                <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">执行流程 (Execution Flow)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">LIVE</span>
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="relative flex flex-col gap-6">
                        {/* 垂直连线 */}
                        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-zinc-800" />

                        {logs.map((log, index) => (
                            <LogNode
                                key={log.id || index}
                                log={log}
                                isLast={index === logs.length - 1}
                                onClick={() => setSelectedLog(log)}
                                isActive={selectedLog?.id === log.id}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* 右侧详情侧边栏 - 1000字符内容展示 */}
            <AnimatePresence>
                {selectedLog && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-2xl"
                    >
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="text-sm font-medium">详情输出</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(null)}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">节点类型</span>
                                    <p className="text-xs font-mono text-indigo-400">{selectedLog.step_type}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">元数据</span>
                                    <pre className="text-[11px] bg-black/50 p-2 rounded border border-zinc-800 overflow-x-auto whitespace-pre-wrap">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">详细内容 (前1000字符)</span>
                                    <div className="text-xs font-mono bg-black/50 p-3 rounded border border-zinc-800 leading-relaxed text-zinc-300 break-words">
                                        {formatContent(selectedLog.content)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/**
 * 格式化内容，1000字符截断
 */
function formatContent(content: string | null) {
    if (!content) return "无内容"
    if (content.length <= 1000) return content
    return content.substring(0, 1000) + "..."
}

/**
 * 流程节点组件
 */
function LogNode({ log, isLast, onClick, isActive }: { log: AICallLog, isLast: boolean, onClick: () => void, isActive: boolean }) {
    const iconMap = {
        thinking: <Brain className="w-4 h-4 text-blue-400" />,
        tool_call: <Terminal className="w-4 h-4 text-emerald-400" />,
        tool_result: <CheckCircle2 className="w-4 h-4 text-zinc-400" />,
        output: <FileText className="w-4 h-4 text-amber-400" />
    }

    const titleMap = {
        thinking: "思考过程",
        tool_call: "调用工具",
        tool_result: "工具执行结果",
        output: "生成响应"
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClick}
            className={`group relative flex items-start gap-4 cursor-pointer transition-all ${isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
        >
            {/* 图标容器 */}
            <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${isActive ? 'bg-zinc-100 border-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-zinc-900 border-zinc-800 group-hover:border-zinc-700'
                }`}>
                {React.cloneElement(iconMap[log.step_type], {
                    className: `w-4 h-4 ${isActive ? 'text-zinc-900' : iconMap[log.step_type].props.className}`
                })}
            </div>

            {/* 文字描述 */}
            <div className={`flex-1 py-1 px-3 rounded-lg border transition-all ${isActive ? 'bg-zinc-800 border-zinc-700 shadow-lg' : 'bg-transparent border-transparent group-hover:bg-zinc-900/50'
                }`}>
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-tight ${isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                        {titleMap[log.step_type]}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
                <p className={`text-sm mt-0.5 line-clamp-1 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                    {log.content || "正在处理..."}
                </p>
                {log.metadata?.toolName && (
                    <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {log.metadata.toolName}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
