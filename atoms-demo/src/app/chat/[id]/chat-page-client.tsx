"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import SandpackPreview from '@/components/preview/sandpack-preview'
import { useAppContext } from '@/lib/context'
import { useArtifactParser } from '@/lib/use-artifact-parser'

import { updateProjectCode, updateProjectName } from '@/lib/actions/project'
import { getMessagesByProjectId, getAICallLogsByProjectId, type AICallLog } from '@/lib/actions/message'
import {
    PanelLeftClose,
    PanelLeftOpen,
    SendHorizontal,
    ArrowLeft,
    Loader2,
    Bot,
    User,
    Sparkles,
    TerminalSquare,
    Play,
    Files,
    Activity,
    Edit3,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TerminalPanel } from '@/components/sandbox/terminal-panel'
import { FileExplorer } from '@/components/chat/file-explorer'
import { AIStatusPanel } from '@/components/chat/ai-status-panel'
import { DraggableCanvas } from '@/components/ui/draggable-canvas'

/**
 * 消息类型定义
 */
interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt?: string
}

/**
 * 聊天页面客户端属性
 */
interface ChatPageClientProps {
    projectId: string
    projectName: string
    initialCode: string
    initialMessages: ChatMessage[]
    initialAILogs: AICallLog[]
}

/**
 * 流式状态类型
 */
type StreamingStatus = 'idle' | 'submitting' | 'processing' | 'ready' | 'error'

/**
 * 获取流式状态的显示文本
 * @param status - 当前状态
 * @returns 状态对应的显示文本
 */
function getStatusText(status: StreamingStatus): string {
    switch (status) {
        case 'submitting':
            return '正在发送...'
        case 'processing':
            return 'AI 正在思考...'
        case 'ready':
            return '生成完成'
        case 'error':
            return '出错了，请重试'
        default:
            return '思考中...'
    }
}

/**
 * 聊天页面客户端组件
 * 整合聊天交互和代码预览功能
 * @param projectId - 项目唯一标识
 * @param projectName - 项目名称
 * @param initialCode - 初始代码内容
 * @param initialMessages - 初始消息列表
 */
export default function ChatPageClient({
    projectId,
    projectName,
    initialCode,
    initialMessages,
    initialAILogs,
}: ChatPageClientProps) {
    const [isSidebarVisible, setIsSidebarVisible] = useState(true)
    const [isMounted, setIsMounted] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>('idle')
    const [activeTab, setActiveTab] = useState<'preview' | 'terminal' | 'files' | 'ai-status'>('preview')
    const [aiLogs, setAiLogs] = useState<AICallLog[]>(initialAILogs || [])
    const [isEditingName, setIsEditingName] = useState(false)
    const [currentProjectName, setCurrentProjectName] = useState(projectName)
    const [isRenaming, setIsRenaming] = useState(false)

    // Maintain messages state locally
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || [])
    const router = useRouter()





    const { setCode } = useAppContext()
    const { parseAndSet } = useArtifactParser()
    const { toast } = useToast()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    // 组件挂载检测
    useEffect(() => {
        console.log('[ChatPageClient] Setting isMounted to true')
        const timer = setTimeout(() => {
            setIsMounted(true)
        }, 100)
        return () => clearTimeout(timer)
    }, [])

    // 初始化代码
    useEffect(() => {
        console.log('[ChatPageClient] Initializing code:', initialCode?.substring(0, 50) + '...')
        if (initialCode && typeof initialCode === 'string') {
            setCode(initialCode)
        }
    }, [initialCode, setCode])

    /**
     * 解析 AI 响应并更新代码
     */
    const handleAIResponse = useCallback((content: string) => {
        if (content) {
            parseAndSet(content, (newCode: string) => {
                setCode(newCode)
                updateProjectCode(projectId, newCode)
            })
        }
    }, [parseAndSet, setCode, projectId])

    // Polling logic for messages AND AI logs
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (streamingStatus === 'processing') {
            intervalId = setInterval(async () => {
                try {
                    // Poll messages
                    console.log('[Polling] Checking for new messages and AI logs...');
                    const serverMessages = await getMessagesByProjectId(projectId);

                    // Poll AI Logs (only when processing)
                    const logs = await getAICallLogsByProjectId(projectId);
                    if (logs.length !== aiLogs.length) {
                        setAiLogs(logs);
                    }

                    if (serverMessages.length > messages.length) {
                        const newMessages = serverMessages.slice(messages.length);
                        const lastMessage = newMessages[newMessages.length - 1];

                        const mappedServerMessages = serverMessages.map((msg: any) => ({
                            id: msg.id,
                            role: msg.role,
                            content: msg.content,
                            createdAt: msg.created_at
                        }));

                        setMessages(mappedServerMessages);

                        if (lastMessage && lastMessage.role === 'assistant') {
                            console.log('[Polling] Received assistant response');

                            // 确保获取最后且完整的 logs
                            const finalLogs = await getAICallLogsByProjectId(projectId);
                            setAiLogs(finalLogs);

                            setStreamingStatus('ready');
                            handleAIResponse(lastMessage.content);
                            setTimeout(() => setStreamingStatus('idle'), 1500);
                        } else if (lastMessage && lastMessage.role === 'system') {
                            console.log('[Polling] Received system error message');
                            setStreamingStatus('error');
                            setTimeout(() => setStreamingStatus('idle'), 3000);
                        }
                    }
                } catch (error) {
                    console.error('[Polling] Error fetching data:', error);
                }
            }, 2000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [streamingStatus, projectId, messages.length, aiLogs.length, handleAIResponse]);


    // 自动滚动到底部
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, streamingStatus])

    /**
     * 切换侧边栏显示状态
     */
    const toggleSidebar = useCallback(() => {
        setIsSidebarVisible(prev => !prev)
    }, [])

    /**
     * 处理表单提交
     * @param e - 表单事件
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || streamingStatus !== 'idle') return

        const userContent = inputValue.trim()
        setInputValue('')
        setStreamingStatus('submitting')

        // Optimistically add user message
        const optimisticMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: userContent,
            createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisticMessage])

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, optimisticMessage],
                    projectId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            setStreamingStatus('processing');
        } catch (error) {
            console.error('Error sending message:', error);
            setStreamingStatus('error');
            toast.error('发送消息失败，请重试');
            setTimeout(() => setStreamingStatus('idle'), 3000);
        }
    }

    /**
     * 处理键盘事件
     * @param e - 键盘事件
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (inputValue.trim()) {
                const formEvent = new Event('submit', { cancelable: true, bubbles: true })
                handleSubmit(formEvent as unknown as React.FormEvent)
            }
        }
    }

    /**
     * 处理项目重命名
     */
    const handleRename = async () => {
        if (!currentProjectName.trim() || currentProjectName === projectName) {
            setIsEditingName(false)
            setCurrentProjectName(projectName)
            return
        }

        setIsRenaming(true)
        try {
            await updateProjectName(projectId, currentProjectName.trim())
            setIsEditingName(false)
            router.refresh()
            toast.success('项目重命名成功')
        } catch (error) {
            console.error('重命名失败:', error)
            toast.error('重命名失败')
            setCurrentProjectName(projectName)
        } finally {
            setIsRenaming(false)
        }
    }

    // 加载状态
    const isLoading = streamingStatus !== 'idle' && streamingStatus !== 'ready' && streamingStatus !== 'error'

    // 骨架屏占位
    if (!isMounted) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="relative flex h-screen w-screen overflow-hidden bg-background">
            {/* 顶部导航栏 */}
            <header className="absolute top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-lg border-b border-zinc-100 z-50 flex items-center px-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="gap-2 text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">返回</span>
                    </Button>
                </Link>

                <div className="flex-1 flex justify-center items-center">
                    {isEditingName ? (
                        <div className="flex items-center gap-2 max-w-md w-full">
                            <Input
                                value={currentProjectName}
                                onChange={(e) => setCurrentProjectName(e.target.value)}
                                onBlur={handleRename}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRename()
                                    if (e.key === 'Escape') {
                                        setIsEditingName(false)
                                        setCurrentProjectName(projectName)
                                    }
                                }}
                                autoFocus
                                className="h-8 text-center font-semibold"
                                disabled={isRenaming}
                            />
                        </div>
                    ) : (
                        <div
                            className="group flex items-center gap-2 cursor-pointer hover:bg-zinc-100 px-3 py-1 rounded-lg transition-colors"
                            onClick={() => setIsEditingName(true)}
                        >
                            <h1 className="font-semibold text-zinc-900 truncate max-w-md">
                                {currentProjectName}
                            </h1>
                            <Edit3 className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>

                {/* 用户菜单 */}
                <UserMenu />
            </header>

            {/* 侧边栏悬浮唤出按钮 */}
            {!isSidebarVisible && (
                <div className="absolute left-6 top-20 z-[100] animate-in fade-in zoom-in duration-300">
                    <Button
                        variant="default"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-12 w-12 rounded-2xl shadow-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all active:scale-95"
                    >
                        <PanelLeftOpen className="h-6 w-6" />
                        <span className="sr-only">打开侧边栏</span>
                    </Button>
                </div>
            )}

            {/* 主内容区域 */}
            <main className="flex flex-1 h-full w-full overflow-hidden pt-14">
                <ResizablePanelGroup
                    orientation="horizontal"
                    className="flex-1 h-full"
                    id="chat-layout-v3"
                >
                    {isSidebarVisible && (
                        <>
                            {/* 聊天侧边栏 */}
                            <ResizablePanel
                                defaultSize="30%"
                                minSize="20%"
                                maxSize="50%"
                                className="flex flex-col h-full bg-zinc-50/50 relative border-r z-20 shadow-xl"
                            >
                                {/* 侧边栏头部 */}
                                <div className="flex items-center justify-between p-4 border-b bg-white/50">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        <span className="font-medium text-sm text-zinc-700">AI 助手</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleSidebar}
                                        className="h-8 w-8 text-zinc-400 hover:text-zinc-700"
                                    >
                                        <PanelLeftClose className="h-4 w-4" />
                                        <span className="sr-only">关闭侧边栏</span>
                                    </Button>
                                </div>

                                {/* 消息列表区域 */}
                                <div
                                    ref={chatContainerRef}
                                    className="flex-1 overflow-hidden"
                                >
                                    <ScrollArea className="h-full px-4">
                                        {messages.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 gap-3">
                                                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <Sparkles className="w-8 h-8 text-indigo-500" />
                                                </div>
                                                <p className="font-medium">欢迎使用 AI 编程助手</p>
                                                <p className="text-sm text-center max-w-xs">
                                                    描述您想要创建的 UI 组件，AI 将自动生成代码并实时预览
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-4 py-4">
                                            {messages.map((message, index) => (
                                                <MessageBubble
                                                    key={message.id || index}
                                                    message={message}
                                                />
                                            ))}

                                            {/* AI 思考状态 */}
                                            {streamingStatus !== 'idle' && (
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                        <Bot className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-zinc-500 bg-white px-4 py-3 rounded-2xl border">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        <span>{getStatusText(streamingStatus)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div ref={messagesEndRef} />
                                        </div>
                                    </ScrollArea>
                                </div>

                                {/* 输入区域 */}
                                <div className="border-t bg-white p-4">
                                    <form onSubmit={handleSubmit} className="relative">
                                        <Textarea
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="描述您想要的功能... (Shift+Enter 换行)"
                                            className="min-h-[60px] w-full resize-none rounded-xl pr-12 py-3 text-sm"
                                            disabled={isLoading}
                                            rows={3}
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={isLoading || !inputValue.trim()}
                                            className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            <SendHorizontal className="h-4 w-4" />
                                            <span className="sr-only">发送</span>
                                        </Button>
                                    </form>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle className="z-20 bg-transparent hover:bg-indigo-500/50 transition-colors w-1" />
                        </>
                    )}

                    {/* 代码预览与终端区域 - 使用 DraggableCanvas */}
                    <ResizablePanel defaultSize={isSidebarVisible ? "70%" : "100%"}>
                        {/* 引用 DraggableCanvas 组件 */}
                        <div className="h-full w-full relative bg-zinc-950">
                            {/* 顶部标签栏 - 悬浮在画布上方 */}
                            <div className="absolute top-4 left-4 z-40 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg flex items-center p-1 gap-1 shadow-lg">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveTab('preview')}
                                    className={`h-7 px-3 text-xs gap-2 rounded-md ${activeTab === 'preview'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                >
                                    <Play className="w-3 h-3" />
                                    <span>预览</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveTab('terminal')}
                                    className={`h-7 px-3 text-xs gap-2 rounded-md ${activeTab === 'terminal'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                >
                                    <TerminalSquare className="w-3 h-3" />
                                    <span>终端</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveTab('files')}
                                    className={`h-7 px-3 text-xs gap-2 rounded-md ${activeTab === 'files'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                >
                                    <Files className="w-3 h-3" />
                                    <span>文件</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveTab('ai-status')}
                                    className={`h-7 px-3 text-xs gap-2 rounded-md ${activeTab === 'ai-status'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                >
                                    <Activity className="w-3 h-3" />
                                    <span>AI 状态</span>
                                </Button>
                            </div>

                            {/* 内容区域 */}
                            <div className="w-full h-full text-white">
                                {activeTab === 'preview' && (
                                    <DraggableCanvas
                                        defaultWidth="100%"
                                        defaultHeight="100%"
                                    >
                                        <SandpackPreview />
                                    </DraggableCanvas>
                                )}

                                {activeTab === 'terminal' && (
                                    <div className="w-full h-full bg-black pt-16">
                                        <TerminalPanel projectId={projectId} className="h-full border-none rounded-none" />
                                    </div>
                                )}

                                {activeTab === 'files' && (
                                    <div className="w-full h-full bg-zinc-50 pt-16">
                                        <FileExplorer projectId={projectId} />
                                    </div>
                                )}

                                {activeTab === 'ai-status' && (
                                    <div className="w-full h-full bg-zinc-950 pt-16">
                                        <AIStatusPanel logs={aiLogs} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
        </div>
    )
}

/**
 * 消息气泡组件
 * @param message - 消息对象
 */
function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* 头像 */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-zinc-900' : 'bg-indigo-100'
                }`}>
                {isUser ? (
                    <User className="w-4 h-4 text-white" />
                ) : (
                    <Bot className="w-4 h-4 text-indigo-600" />
                )}
            </div>

            {/* 消息内容 */}
            <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'
                }`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap ${isUser
                    ? 'bg-zinc-900 text-white rounded-tr-sm'
                    : 'bg-white text-zinc-800 border rounded-tl-sm'
                    }`}>
                    {message.content}
                </div>
                {message.createdAt && (
                    <span className="text-xs text-zinc-400 px-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                )}
            </div>
        </div>
    )
}

/**
 * 用户菜单组件
 */
function UserMenu() {
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(false)

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' })
            if (response.ok) {
                window.location.href = '/'
            }
        } catch {
            toast.error('退出失败，请稍后重试')
        }
    }

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="gap-2 text-zinc-600"
            >
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center">
                    <User className="w-3 h-3 text-zinc-600" />
                </div>
                <span className="hidden md:inline">用户</span>
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                            退出登录
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
