'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { ArrowLeft, Send, MessageSquare, X, Loader2, Sparkles, Activity, FileCode } from 'lucide-react'
import { getAICallLogsByProjectId, getMessagesByProjectId, type AICallLog } from '@/lib/actions/message'
import { AIStatusPanel } from '@/components/chat/ai-status-panel'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import UserMenu from '@/components/layout/user-menu'
import { Sandpack } from '@codesandbox/sandpack-react'
import { createClient } from '@/lib/supabase'
import { useArtifactParser } from '@/lib/use-artifact-parser'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
}

interface ChatNewClientProps {
    projectId: string
    projectName: string
    initialCode: string
    initialMessages: ChatMessage[]
    initialAILogs: AICallLog[]
}

/**
 * 获取消息内容的纯文本
 */
function getMessageContent(message: any): string {
    if (message.parts) {
        const textPart = message.parts.find((part: any) => part.type === 'text')
        if (textPart?.text) {
            return textPart.text
        }
    }
    return message.content || ''
}

/**
 * Chat-New 客户端组件
 * 
 * 核心功能：
 * - 可调节分栏布局（左侧聊天，右侧预览）
 * - 流式 AI 聊天对话
 * - 实时代码预览
 * - 数据持久化
 */
export default function ChatNewClient({
    projectId,
    projectName,
    initialCode,
    initialMessages,
    initialAILogs,
}: ChatNewClientProps) {
    const router = useRouter()
    const supabase = createClient()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [currentCode, setCurrentCode] = useState(initialCode)
    const [inputValue, setInputValue] = useState('')
    const { parseAndSet } = useArtifactParser()

    const [aiLogs, setAiLogs] = useState<AICallLog[]>(initialAILogs || [])
    const [activeTab, setActiveTab] = useState<'code' | 'status'>('code')
    const [isProcessing, setIsProcessing] = useState(false)

    // Check initial state for pending message
    useEffect(() => {
        const lastMsg = initialMessages[initialMessages.length - 1]
        if (lastMsg && lastMsg.role === 'user') {
            setIsProcessing(true)
            setActiveTab('status') // Auto switch to status tab if processing
        }
    }, [])

    // Realtime subscription for ai_call_logs
    useEffect(() => {
        const channel = supabase
            .channel(`ai_logs:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ai_call_logs',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    const newLog = payload.new as AICallLog
                    setAiLogs((prev) => [...prev, newLog])

                    // Check if this is an output log (task completion)
                    if (newLog.step_type === 'output') {
                        setIsProcessing(false)
                        // Optionally refresh to sync messages
                        router.refresh()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId, supabase, router])

    // 使用 Vercel AI SDK 的 useChat hook
    const { messages, sendMessage, status } = useChat()



    /**
     * 保存消息到数据库
     */
    const saveMessage = async (role: string, content: string) => {
        try {
            await supabase.from('messages').insert({
                project_id: projectId,
                role,
                content,
                created_at: new Date().toISOString(),
            })
        } catch (error) {
            console.error('保存消息失败:', error)
        }
    }

    /**
     * 更新项目代码到数据库
     */
    const updateProjectCode = async (code: string) => {
        try {
            await supabase
                .from('projects')
                .update({
                    current_code: code,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', projectId)
        } catch (error) {
            console.error('保存代码失败:', error)
        }
    }

    // 合并初始消息和新消息
    const allMessages = useMemo(() => {
        const initialMessageIds = new Set(initialMessages.map(m => m.id))
        const newMessages = messages.filter(m => !initialMessageIds.has(m.id))
        return [...initialMessages, ...newMessages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: getMessageContent(m),
        }))]
    }, [initialMessages, messages])

    // 解析 AI 响应并更新代码
    useEffect(() => {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && status === 'ready') {
            const content = getMessageContent(lastMessage)
            if (content) {
                parseAndSet(content, (newCode: string) => {
                    setCurrentCode(newCode)
                    updateProjectCode(newCode)
                })

                // 保存助手消息
                saveMessage('assistant', content)
            }
        }
    }, [messages, status]) // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 处理表单提交
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!inputValue.trim() || status === 'streaming' || isProcessing) return

        const userContent = inputValue.trim()
        setInputValue('')

        // Optimistic UI updates handled by useChat but we also want to track our own polling state
        // Actually, logic is: useChat handles the stream. 
        // IF useChat fails or we reload, THEN we poll.
        // But here we are using useChat. 
        // Wait, if we use sendMessage, useChat manages it.
        // But we want to show logs too.

        setIsProcessing(true)
        setActiveTab('status')

        // 保存用户消息
        await saveMessage('user', userContent)

        // 发送消息到 AI
        sendMessage({ text: userContent })
    }

    /**
     * 自动滚动到最新消息
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [allMessages])

    /**
     * 处理键盘事件：Enter 发送，Shift+Enter 换行
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const form = e.currentTarget.form
            if (form) {
                form.requestSubmit()
            }
        }
    }

    const isLoading = status === 'submitted' || status === 'streaming' || isProcessing

    return (
        <div className="h-screen flex flex-col bg-zinc-50">
            {/* 顶部导航栏 */}
            <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard')}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">返回</span>
                    </Button>
                    <h1 className="text-lg font-semibold text-zinc-900">{projectName}</h1>
                </div>
                <UserMenu />
            </header>

            {/* 可调节分栏布局 */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup orientation="horizontal" id="chat-new-layout" className="h-full">
                    {/* 左侧聊天区域 */}
                    <ResizablePanel
                        id="chat-sidebar"
                        defaultSize="25%"
                        minSize="20%"
                        maxSize="50%"
                    >
                        <div className="h-full flex flex-col bg-white border-r">
                            {/* 聊天区域头部 */}
                            <div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
                                <h2 className="font-medium text-zinc-900">对话</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsSidebarCollapsed(true)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* 消息列表 */}
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {allMessages.map((message: ChatMessage) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-zinc-100 text-zinc-900'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-zinc-100 rounded-lg px-4 py-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* 输入区域 */}
                            <div className="border-t p-4 shrink-0">
                                <form onSubmit={handleSubmit} className="space-y-2">
                                    <Textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                                        className="min-h-[80px] resize-none"
                                        disabled={isLoading}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={!inputValue.trim() || isLoading}
                                            className="gap-2"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            发送
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* 右侧预览区域 */}
                    <ResizablePanel defaultSize="75%">
                        <div className="h-full bg-zinc-900 flex flex-col">
                            {/* Tab Switcher */}
                            <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-4">
                                <button
                                    onClick={() => setActiveTab('code')}
                                    className={`flex items-center gap-2 text-sm h-full border-b-2 px-2 transition-colors ${activeTab === 'code'
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                                        }`}
                                >
                                    <FileCode className="w-4 h-4" />
                                    代码预览
                                </button>
                                <button
                                    onClick={() => setActiveTab('status')}
                                    className={`flex items-center gap-2 text-sm h-full border-b-2 px-2 transition-colors ${activeTab === 'status'
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                                        }`}
                                >
                                    <Activity className="w-4 h-4" />
                                    AI 状态
                                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                {activeTab === 'code' ? (
                                    currentCode ? (
                                        <Sandpack
                                            template="react"
                                            theme="dark"
                                            options={{
                                                showNavigator: false,
                                                editorHeight: '100vh',
                                                showTabs: false,
                                                showLineNumbers: false,
                                                editorWidthPercentage: 0,
                                            }}
                                            customSetup={{
                                                dependencies: {
                                                    'lucide-react': 'latest',
                                                    'recharts': 'latest',
                                                    'framer-motion': 'latest',
                                                    'clsx': 'latest',
                                                    'tailwind-merge': 'latest',
                                                },
                                            }}
                                            files={{
                                                '/App.js': currentCode,
                                            }}
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-zinc-500">
                                            <div className="text-center space-y-3">
                                                <MessageSquare className="w-12 h-12 mx-auto opacity-50" />
                                                <p className="text-sm">开始对话，让 AI 生成代码</p>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <AIStatusPanel logs={aiLogs} />
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* 侧边栏折叠时的悬浮唤起按钮 */}
            {isSidebarCollapsed && (
                <Button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="fixed left-4 bottom-4 rounded-full w-12 h-12 shadow-lg"
                    size="icon"
                >
                    <MessageSquare className="w-5 h-5" />
                </Button>
            )}
        </div>
    )
}
