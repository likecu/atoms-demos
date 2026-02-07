"use client";

import { useState, useEffect } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import ChatArea from "../chat/chat-area";
import SandpackPreview from "../preview/sandpack-preview";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PanelLeftClose, PanelLeftOpen, Upload, Copy, Check, ExternalLink, MonitorPlay } from "lucide-react";
import { useAppContext } from "@/lib/context";

/**
 * ChatLayout 主布局组件
 * 包含可调整大小的聊天面板和预览面板
 * 支持发布功能，生成公开分享链接
 */
export default function ChatLayout() {
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const { code } = useAppContext();

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarVisible(!isSidebarVisible);
    };

    const togglePreview = () => {
        setIsPreviewVisible(!isPreviewVisible);
    };

    /**
     * 发布当前代码为公开链接
     */
    const handlePublish = async () => {
        if (isPublishing) return;

        setIsPublishing(true);
        try {
            const response = await fetch("/api/publish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "发布失败");
            }

            setShareUrl(data.shareUrl);
            setShareDialogOpen(true);
        } catch (error) {
            console.error("发布失败:", error);
            alert(error instanceof Error ? error.message : "发布失败，请重试");
        } finally {
            setIsPublishing(false);
        }
    };

    /**
     * 复制分享链接到剪贴板
     */
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("复制失败:", error);
        }
    };

    if (!mounted) return null;

    return (
        <div className="relative flex h-screen w-screen overflow-hidden bg-background">
            {/* 唤出按钮：当侧边栏隐藏时显示，确保 z-index 极高且醒目 */}
            {!isSidebarVisible && (
                <div className="absolute left-6 top-6 z-[100] animate-in fade-in zoom-in duration-300">
                    <Button
                        variant="default"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-12 w-12 rounded-2xl shadow-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all active:scale-90 flex items-center justify-center border-none"
                    >
                        <PanelLeftOpen className="h-6 w-6" />
                        <span className="sr-only">Open Sidebar</span>
                    </Button>
                </div>
            )}

            <div className="flex flex-1 h-full w-full overflow-hidden">
                <ResizablePanelGroup orientation="horizontal" className="flex-1 h-full">
                    {isSidebarVisible && (
                        <>

                            <ResizablePanel
                                defaultSize="60%"
                                minSize="20%"
                                maxSize="80%"
                                className="flex flex-col border-r h-full bg-zinc-50/50 relative group"
                            >
                                {/* Header 区域 */}
                                <div className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur-sm">
                                    <h1 className="text-lg font-semibold text-zinc-800">Atoms Demo</h1>
                                    <div className="flex items-center gap-2">
                                        {/* 全屏/显示预览切换按钮 */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={togglePreview}
                                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 transition-all rounded-lg"
                                            title={isPreviewVisible ? "隐藏预览" : "显示预览"}
                                        >
                                            <MonitorPlay className="h-4 w-4" />
                                            <span className="sr-only">Toggle Preview</span>
                                        </Button>
                                        {/* Publish 按钮 */}
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handlePublish}
                                            disabled={isPublishing}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                        >
                                            <Upload className="h-4 w-4 mr-1.5" />
                                            {isPublishing ? "发布中..." : "Publish"}
                                        </Button>
                                        {/* 收起按钮 */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleSidebar}
                                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 transition-all rounded-lg"
                                        >
                                            <PanelLeftClose className="h-4 w-4" />
                                            <span className="sr-only">Close Sidebar</span>
                                        </Button>
                                    </div>
                                </div>
                                <ChatArea />
                            </ResizablePanel>
                            {isPreviewVisible && <ResizableHandle withHandle />}
                        </>
                    )}

                    {/* Panel 3: Preview */}
                    {isPreviewVisible && (
                        <ResizablePanel
                            defaultSize="40%"
                            minSize="20%"
                            className="h-full"
                        >
                            <SandpackPreview />
                        </ResizablePanel>
                    )}
                </ResizablePanelGroup>
            </div>

            {/* 分享链接弹窗 */}
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-500" />
                            发布成功！
                        </DialogTitle>
                        <DialogDescription>
                            您的网页已发布，可以通过以下链接分享给他人访问。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-4">
                        <div className="flex-1 rounded-lg border bg-zinc-50 px-3 py-2 text-sm text-zinc-700 truncate">
                            {shareUrl}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyLink}
                            className="shrink-0"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(shareUrl, "_blank")}
                            className="shrink-0"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                        任何人都可以通过此链接访问您发布的网页
                    </p>
                </DialogContent>
            </Dialog>
        </div>
    );
}

