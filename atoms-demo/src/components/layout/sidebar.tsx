"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, MessageSquare, LogOut, User } from "lucide-react";

/**
 * 侧边栏历史记录项的静态数据
 */
const mockHistory = [
    { id: "1", title: "创建登录页面", time: "2 分钟前" },
    { id: "2", title: "设计仪表盘布局", time: "1 小时前" },
    { id: "3", title: "构建数据图表", time: "昨天" },
    { id: "4", title: "用户管理界面", time: "2 天前" },
];

/**
 * Sidebar 侧边栏组件
 * 
 * 包含以下功能区域：
 * - 顶部：Logo 和 New Chat 按钮
 * - 中间：历史会话列表
 * - 底部：用户信息和退出按钮
 * 
 * @returns {JSX.Element} 侧边栏组件
 */
export default function Sidebar() {
    return (
        <div className="flex h-full flex-col bg-zinc-900 text-white">
            {/* 顶部区域：Logo + New Chat */}
            <div className="flex flex-col gap-4 p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <span className="text-sm font-bold">A</span>
                    </div>
                    <span className="font-semibold text-lg">Atoms</span>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white"
                >
                    <PlusIcon className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            {/* 中间区域：历史记录列表 */}
            <ScrollArea className="flex-1 px-2 py-4">
                <div className="flex flex-col gap-1">
                    <span className="px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                        History
                    </span>
                    {mockHistory.map((item) => (
                        <button
                            key={item.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-left w-full group"
                        >
                            <MessageSquare className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="truncate">{item.title}</p>
                                <p className="text-xs text-zinc-500">{item.time}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>

            {/* 底部区域：用户信息 */}
            <div className="border-t border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Demo User</p>
                        <p className="text-xs text-zinc-500 truncate">user@example.com</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">退出登录</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
