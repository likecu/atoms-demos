"use client";

import { useState, useEffect } from "react";
import {
    SandpackProvider,
    SandpackLayout,
    SandpackPreview as SandpackPreviewPanel,
} from "@codesandbox/sandpack-react";
import { Bot, User, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * 消息类型定义
 */
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

/**
 * 分享对话+预览组件属性
 */
interface ShareWithChatProps {
    /** 代码内容 */
    code: string;
    /** 对话消息列表 */
    messages: Message[];
}

/**
 * 分享对话+预览组件
 * 左侧显示对话历史,右侧显示网页预览
 * 
 * @param code - React代码内容
 * @param messages - 对话历史记录
 */
export default function ShareWithChat({ code, messages }: ShareWithChatProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const files = {
        "/App.js": code,
    };

    if (!isMounted) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen bg-white">
            {/* 左侧对话历史区 */}
            <div className="w-[400px] border-r border-zinc-200 flex flex-col bg-zinc-50/50">
                {/* 头部 */}
                <div className="border-b border-zinc-200 p-4 bg-white">
                    <h2 className="font-semibold text-zinc-900">对话历史</h2>
                    <p className="text-sm text-zinc-500 mt-1">
                        查看完整的AI对话记录
                    </p>
                </div>

                {/* 消息列表 */}
                <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            <p className="text-sm">暂无对话记录</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {messages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* 右侧预览区 */}
            <div className="flex-1 bg-white">
                <SandpackProvider
                    template="react"
                    files={files}
                    theme="light"
                    customSetup={{
                        dependencies: {
                            "lucide-react": "latest",
                            "@radix-ui/react-icons": "latest",
                            "recharts": "latest",
                            "framer-motion": "latest",
                            "clsx": "latest",
                            "tailwind-merge": "latest",
                        },
                    }}
                >
                    <SandpackLayout className="h-full">
                        <SandpackPreviewPanel
                            showOpenInCodeSandbox={false}
                            showRefreshButton={true}
                            style={{ height: "100vh", width: "100%" }}
                        />
                    </SandpackLayout>
                </SandpackProvider>
            </div>
        </div>
    );
}

/**
 * 消息气泡组件
 * @param message - 消息对象
 */
function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";

    return (
        <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
            {/* 头像 */}
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? "bg-zinc-900" : "bg-indigo-100"
                    }`}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-white" />
                ) : (
                    <Bot className="w-4 h-4 text-indigo-600" />
                )}
            </div>

            {/* 消息内容 */}
            <div
                className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"
                    }`}
            >
                <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap break-words ${isUser
                            ? "bg-zinc-900 text-white rounded-tr-sm"
                            : "bg-white text-zinc-800 border rounded-tl-sm"
                        }`}
                >
                    {message.content}
                </div>
                {message.created_at && (
                    <span className="text-xs text-zinc-400 px-1">
                        {new Date(message.created_at).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                )}
            </div>
        </div>
    );
}
