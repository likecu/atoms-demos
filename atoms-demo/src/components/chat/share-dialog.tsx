"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Check, Loader2, Globe, MessageSquare } from "lucide-react";
import { getProjectFiles, getProjectFileContent } from "@/lib/actions/files";

/**
 * 分享对话框组件属性
 */
interface ShareDialogProps {
    /** 是否打开对话框 */
    open: boolean;
    /** 关闭对话框回调 */
    onOpenChange: (open: boolean) => void;
    /** 项目ID */
    projectId: string;
    /** 当前代码内容 */
    code: string;
}

/**
 * 分享对话框组件
 * 允许用户生成分享链接,支持两种预览模式
 * 
 * @param open - 对话框打开状态
 * @param onOpenChange - 状态改变回调
 * @param projectId - 项目ID
 * @param code - 当前代码内容
 */
export function ShareDialog({ open, onOpenChange, projectId, code }: ShareDialogProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string>("");
    const [copiedPreview, setCopiedPreview] = useState(false);
    const [copiedChat, setCopiedChat] = useState(false);
    const { toast } = useToast();

    /**
     * 处理发布操作
     * 调用发布API生成分享token
     */
    /**
     * 处理发布操作
     * 调用发布API生成分享token
     */
    const handlePublish = async () => {
        if (isPublishing) return;

        setIsPublishing(true);
        try {
            let codeToPublish = code;

            // 如果当前上下文中没有代码，尝试从项目文件中获取
            if (!codeToPublish) {
                try {
                    const files = await getProjectFiles(projectId);
                    if (files.length > 0) {
                        // 优先查找特定入口文件，否则取第一个文件
                        const mainFile = files.find(f =>
                            f.type === 'file' && (
                                f.name === 'App.tsx' ||
                                f.name === 'App.js' ||
                                f.name === 'index.html' ||
                                f.name === 'main.py' ||
                                f.name.endsWith('.tsx') ||
                                f.name.endsWith('.py')
                            )
                        ) || files.find(f => f.type === 'file');

                        if (mainFile) {
                            codeToPublish = await getProjectFileContent(projectId, mainFile.name);
                        }
                    }
                } catch (err) {
                    console.error("尝试获取项目文件失败:", err);
                }
            }

            if (!codeToPublish) {
                toast.error("未找到可分享的代码内容");
                setIsPublishing(false);
                return;
            }

            const response = await fetch("/api/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    code: codeToPublish,
                }),
            });

            if (!response.ok) {
                throw new Error("发布失败");
            }

            const data = await response.json();
            if (data.success && data.shareUrl) {
                setShareUrl(data.shareUrl);
                toast.success("分享链接已生成");
            } else {
                throw new Error("发布失败");
            }
        } catch (error) {
            console.error("发布错误:", error);
            toast.error("发布失败，请稍后重试");
        } finally {
            setIsPublishing(false);
        }
    };

    /**
     * 复制链接到剪贴板
     * @param url - 要复制的URL
     * @param mode - 分享模式
     */
    const copyToClipboard = async (url: string, mode: "preview" | "chat") => {
        try {
            const fullUrl = mode === "chat" ? `${url}?mode=chat` : url;
            await navigator.clipboard.writeText(fullUrl);

            if (mode === "preview") {
                setCopiedPreview(true);
                setTimeout(() => setCopiedPreview(false), 2000);
            } else {
                setCopiedChat(true);
                setTimeout(() => setCopiedChat(false), 2000);
            }

            toast.success("链接已复制到剪贴板");
        } catch (error) {
            toast.error("复制失败，请手动复制链接");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>分享项目</DialogTitle>
                    <DialogDescription>
                        生成公开分享链接,允许其他人查看你的作品
                    </DialogDescription>
                </DialogHeader>

                {!shareUrl ? (
                    <div className="flex flex-col gap-4 py-4">
                        <p className="text-sm text-zinc-600">
                            点击下方按钮生成分享链接。分享后,任何人都可以通过链接访问你的项目。
                        </p>
                        <Button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="w-full"
                        >
                            {isPublishing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Globe className="w-4 h-4 mr-2" />
                                    生成分享链接
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-4">
                        {/* 纯网页预览链接 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Globe className="w-4 h-4 text-indigo-500" />
                                <span>纯网页预览</span>
                            </div>
                            <p className="text-xs text-zinc-500">
                                只显示网页效果,不包含对话内容
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 text-sm"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => copyToClipboard(shareUrl, "preview")}
                                >
                                    {copiedPreview ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* 对话+预览链接 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span>对话历史+预览</span>
                            </div>
                            <p className="text-xs text-zinc-500">
                                显示完整对话记录和网页预览
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    value={`${shareUrl}?mode=chat`}
                                    readOnly
                                    className="flex-1 text-sm"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => copyToClipboard(shareUrl, "chat")}
                                >
                                    {copiedChat ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => {
                                setShareUrl("");
                                onOpenChange(false);
                            }}
                            className="w-full mt-2"
                        >
                            关闭
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
