"use client";

import React from 'react';
import { useWorkspace, AgentNode } from '@/lib/workspace-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, Clock, Loader2, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OrchestrationView() {
    const { state } = useWorkspace();
    const { agents } = state;

    if (!agents || agents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm font-medium">等待任务分配...</p>
                <p className="text-xs text-zinc-400">当任务被拆解为子任务时，Agent 将会出现在这里</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-zinc-50/50 p-6 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-lg font-semibold text-zinc-800">Agent Orchestration</h2>
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                    {agents.length} Active Agents
                </Badge>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    <AnimatePresence mode='popLayout'>
                        {agents.map((agent) => (
                            <AgentSwimlane key={agent.id} agent={agent} />
                        ))}
                    </AnimatePresence>
                </div>
            </ScrollArea>
        </div>
    );
}

function AgentSwimlane({ agent }: { agent: AgentNode }) {
    const isWorking = agent.status === 'working';
    const isCompleted = agent.status === 'completed';
    const isError = agent.status === 'error';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <Card className={`
                h-full border-t-4 shadow-sm hover:shadow-md transition-shadow
                ${isWorking ? 'border-t-indigo-500 bg-indigo-50/30' : ''}
                ${isCompleted ? 'border-t-emerald-500 bg-white' : ''}
                ${isError ? 'border-t-red-500 bg-red-50/30' : ''}
                ${!isWorking && !isCompleted && !isError ? 'border-t-zinc-300 bg-zinc-50' : ''}
            `}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl flex items-center justify-center
                                ${isWorking ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-500'}
                                ${isCompleted ? 'bg-emerald-100 text-emerald-600' : ''}
                            `}>
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-zinc-900">{agent.name}</CardTitle>
                                <p className="text-xs text-zinc-500 font-mono mt-0.5">{agent.role}</p>
                            </div>
                        </div>
                        <StatusIndicator status={agent.status} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Current Task Status */}
                        <div className="bg-white rounded-lg p-3 border border-zinc-100 shadow-sm">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Current Task</p>
                            <div className="flex items-start gap-2">
                                {isWorking && <Loader2 className="w-3.5 h-3.5 mt-0.5 text-indigo-500 animate-spin flex-shrink-0" />}
                                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />}
                                {!isWorking && !isCompleted && <Clock className="w-3.5 h-3.5 mt-0.5 text-zinc-400 flex-shrink-0" />}

                                <p className={`text-sm leading-snug ${isWorking ? 'text-zinc-800 font-medium' : 'text-zinc-500'}`}>
                                    {agent.currentTask || "Idle"}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar (Fake for now, or based on task steps if available) */}
                        {isWorking && (
                            <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-indigo-500"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "60%" }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatType: "reverse" }}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function StatusIndicator({ status }: { status: AgentNode['status'] }) {
    switch (status) {
        case 'working':
            return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase">Working</span>
                </div>
            );
        case 'completed':
            return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Done</span>
                </div>
            );
        case 'error':
            return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold uppercase">Error</span>
                </div>
            );
        default:
            return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                    <span className="text-[10px] font-bold uppercase">Idle</span>
                </div>
            );
    }
}
