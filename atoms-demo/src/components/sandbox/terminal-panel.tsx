import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Terminal as TerminalIcon, Loader2 } from 'lucide-react';
import { execSandboxCommand } from '@/lib/actions/sandbox';
import { type AICallLog } from '@/lib/actions/message';

interface TerminalPanelProps {
    className?: string;
    projectId?: string; // Optional context
    logs?: AICallLog[];
}

export function TerminalPanel({ className, projectId, logs = [] }: TerminalPanelProps) {
    const [history, setHistory] = useState<Array<{ cmd: string; output: string; error?: boolean; source?: 'user' | 'ai' }>>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const processedLogIds = useRef<Set<string>>(new Set());

    // 监听 AI 日志并同步到终端
    useEffect(() => {
        if (!logs.length) return;

        logs.forEach(log => {
            if (processedLogIds.current.has(log.id)) return;

            // 处理 executeBash 的工具调用结果
            if (log.step_type === 'tool_result' && log.metadata?.toolName === 'executeBash') {
                const output = typeof log.metadata.fullResult === 'object'
                    ? (log.metadata.fullResult.stdout || log.metadata.fullResult.stderr || JSON.stringify(log.metadata.fullResult))
                    : log.content;

                // 尝试找到对应的调用参数 (cmd)
                // 这可能需要向上查找最近的一个 tool_call 且 ID 匹配，但在 logs 数组中可能不连续
                // 简化处理：从 content 解析或显示 "AI Command"
                // 更好的做法是后端在 tool_result 中也带上 command，或者我们需要在前端关联
                // 这里我们暂时只显示 Output，或者尝试从 logs 中查找对应的 tool_call

                const toolCallLog = logs.find(l =>
                    l.step_type === 'tool_call' &&
                    l.metadata?.toolCallId === log.metadata?.toolCallId
                );

                const cmd = toolCallLog?.metadata?.args?.command || 'AI Command';

                setHistory(prev => [...prev, {
                    cmd: cmd,
                    output: output || '(No output)',
                    error: log.metadata?.fullResult?.exitCode !== 0,
                    source: 'ai'
                }]);

                processedLogIds.current.add(log.id);
            }
        });
    }, [logs]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);

    const handleRun = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        if (!projectId) {
            setHistory(prev => [...prev, { cmd: 'Error', output: 'Project ID not found. Cannot connect to sandbox.', error: true, source: 'user' }]);
            return;
        }

        const command = input.trim();
        setLoading(true);
        setInput(''); // Clear input immediately

        // Optimistic update
        setHistory(prev => [...prev, { cmd: command, output: 'Running...', error: false, source: 'user' }]);

        try {
            const result = await execSandboxCommand(projectId, command);

            setHistory(prev => {
                const newHistory = [...prev];
                // Replace the last loading entry
                newHistory[newHistory.length - 1] = {
                    cmd: command,
                    output: result.stdout + (result.stderr ? `\nError:\n${result.stderr}` : ''),
                    error: result.exitCode !== 0,
                    source: 'user'
                };
                return newHistory;
            });
        } catch (err: any) {
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = {
                    cmd: command,
                    output: `System Error: ${err.message}`,
                    error: true,
                    source: 'user'
                };
                return newHistory;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-black text-green-400 font-mono text-sm p-2 rounded-md ${className}`}>
            <div className="flex items-center gap-2 border-b border-green-900 pb-2 mb-2">
                <TerminalIcon className="w-4 h-4" />
                <span className="font-bold">Sandbox Terminal</span>
            </div>

            <ScrollArea className="flex-1 mb-2">
                <div className="space-y-4 p-2">
                    {history.length === 0 && (
                        <div className="text-gray-500 italic">
                            Connected to sandbox. Type a command to start.
                            <br />
                            Warning: Creating a new environment may take a few seconds.
                        </div>
                    )}
                    {history.map((entry, i) => (
                        <div key={i} className="break-words whitespace-pre-wrap">
                            <div className="flex gap-2">
                                <span className={entry.source === 'ai' ? 'text-purple-400' : 'text-yellow-400'}>
                                    {entry.source === 'ai' ? '(AI) $' : '$'}
                                </span>
                                <span className={entry.source === 'ai' ? 'text-purple-300' : ''}>{entry.cmd}</span>
                            </div>
                            <div className={entry.error ? 'text-red-400' : 'text-green-300'}>
                                {entry.output}
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <form onSubmit={handleRun} className="flex gap-2">
                <div className="flex items-center text-yellow-400 font-bold">$</div>
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white font-mono h-8"
                    placeholder="ls -la"
                    disabled={loading}
                    autoFocus
                />
                <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    disabled={loading}
                    className="bg-green-900 text-green-100 hover:bg-green-800"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
                </Button>
            </form>
        </div>
    );
}
