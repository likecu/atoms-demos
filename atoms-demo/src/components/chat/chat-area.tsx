"use client";

import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/lib/context";
import { useArtifactParser } from "@/lib/use-artifact-parser";
import { useToast } from "@/components/ui/use-toast";

type StreamingStatus = 'idle' | 'submitting' | 'streaming' | 'ready' | 'error';

/**
 * 获取当前流式状态的显示文本
 * @param status - 当前状态
 * @returns 状态对应的显示文本
 */
function getStatusText(status: StreamingStatus): string {
    switch (status) {
        case 'submitting':
            return '正在提交...';
        case 'streaming':
            return '正在思考...';
        case 'ready':
            return '完成';
        case 'error':
            return '出错了';
        default:
            return 'Thinking...';
    }
}

/**
 * 获取当前流式状态的显示图标
 * @param status - 当前状态  
 * @returns 状态对应的图标组件
 */
function getStatusIcon(status: StreamingStatus): React.ReactNode {
    switch (status) {
        case 'streaming':
            return (
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                </div>
            );
        case 'error':
            return <span className="text-red-500">!</span>;
        default:
            return null;
    }
}

export default function ChatArea() {
    const { messages, sendMessage, status, error } = useChat();
    const { setCode } = useAppContext();
    const { parseAndSet } = useArtifactParser();
    const [input, setInput] = useState("");
    const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>('idle');
    const [isComposing, setIsComposing] = useState(false);
    const { toast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            setStreamingStatus('submitting');
            sendMessage({ text: input });
            setInput("");
        }
    };

    /**
     * 处理输入法组合开始事件
     */
    const handleCompositionStart = () => {
        setIsComposing(true);
    };

    /**
     * 处理输入法组合结束事件
     */
    const handleCompositionEnd = () => {
        setIsComposing(false);
    };

    useEffect(() => {
        if (status === 'submitted') {
            setStreamingStatus('submitting');
        } else if (status === 'streaming') {
            setStreamingStatus('streaming');
        } else if (status === 'ready') {
            setStreamingStatus('ready');
            setTimeout(() => setStreamingStatus('idle'), 1000);
        }
    }, [status]);

    useEffect(() => {
        if (error) {
            setStreamingStatus('error');
            toast.error(error.message || "AI 生成失败，请重试");
            setTimeout(() => setStreamingStatus('idle'), 3000);
        }
    }, [error, toast]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            // Priority 1: Check for code blocks in text
            const textPart = lastMessage.parts.find((part: any) => part.type === 'text');
            const content = textPart && 'text' in textPart ? (textPart as { text: string }).text : '';

            let codeFound = false;
            if (content) {
                codeFound = parseAndSet(content, setCode);
            }

            // Priority 2: If no code block in text, check for writeFile tool usage
            if (!codeFound) {
                const toolInvocationPart = lastMessage.parts.find((part: any) => part.type === 'tool-invocation');
                if (toolInvocationPart && 'toolInvocation' in toolInvocationPart) {
                    const toolInvocation = (toolInvocationPart as any).toolInvocation;
                    if (toolInvocation.toolName === 'writeFile' && toolInvocation.args) {
                        const { path, content } = toolInvocation.args;
                        if (content && typeof content === 'string') {
                            console.log('[ChatArea] Found code in writeFile tool:', path);
                            setCode(content);
                        }
                    }
                }
            }
        }
    }, [messages, setCode, parseAndSet]);

    const getMessageContent = (message: typeof messages[0]): string => {
        const textPart = message.parts.find((part: { type: string }) => part.type === 'text');
        if (textPart && 'text' in textPart) {
            return (textPart as { text: string }).text;
        }
        return '';
    };

    // 自动滚动到最下方
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full min-h-0 bg-zinc-50/50">
            <div className="flex-1 overflow-hidden p-4 min-h-0">
                <ScrollArea className="h-full pr-4" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-2">
                            <p className="font-medium">Welcome to Atoms Demo</p>
                            <p className="text-sm">Describe the UI component you want to build.</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 pb-4">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex w-max max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === "user"
                                    ? "ml-auto bg-zinc-900 text-white"
                                    : "bg-white border text-zinc-800"
                                    }`}
                            >
                                {getMessageContent(m)}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-2xl bg-white border px-4 py-3 text-sm">
                                <div className="flex items-center gap-2 text-zinc-500">
                                    {getStatusIcon(streamingStatus)}
                                    <span className="transition-all duration-300">
                                        {getStatusText(streamingStatus)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="border-t bg-white p-4">
                <form onSubmit={handleSubmit} className="relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                                e.preventDefault();
                                if (input.trim()) {
                                    handleSubmit(e as any);
                                }
                            }
                        }}
                        placeholder="Describe your UI component... (Shift+Enter for new line)"
                        className="min-h-[60px] w-full resize-none rounded-xl pr-12 py-3"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-3 top-3 h-8 w-8 rounded-lg"
                    >
                        <SendIcon className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    );
}
