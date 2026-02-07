'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Terminal as TerminalIcon, Loader2 } from 'lucide-react';
import { execSandboxCommand } from '@/lib/actions/sandbox';

interface TerminalPanelProps {
    className?: string;
    projectId?: string; // Optional context
}

export function TerminalPanel({ className, projectId }: TerminalPanelProps) {
    const [history, setHistory] = useState<Array<{ cmd: string; output: string; error?: boolean }>>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);

    const handleRun = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const command = input.trim();
        setLoading(true);
        setInput(''); // Clear input immediately

        // Optimistic update
        setHistory(prev => [...prev, { cmd: command, output: 'Running...', error: false }]);

        try {
            const result = await execSandboxCommand(command);

            setHistory(prev => {
                const newHistory = [...prev];
                // Replace the last loading entry
                newHistory[newHistory.length - 1] = {
                    cmd: command,
                    output: result.stdout + (result.stderr ? `\nError:\n${result.stderr}` : ''),
                    error: result.exitCode !== 0
                };
                return newHistory;
            });
        } catch (err: any) {
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = {
                    cmd: command,
                    output: `System Error: ${err.message}`,
                    error: true
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
                            <div className="flex gap-2 text-yellow-400">
                                <span>$</span>
                                <span>{entry.cmd}</span>
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
