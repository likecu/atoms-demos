"use client";

import { useState, useEffect, useRef } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { useAppContext } from "@/lib/context";
import { Loader2 } from "lucide-react";

export default function SandpackPreview() {
    const { code } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsLoading(true);

        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }

        loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
        }, 2000);

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [code]);

    // 如果代码为空，不渲染任何内容
    if (!code || code.trim() === "") {
        return (
            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                <div className="text-center max-w-md px-4">
                    <p className="text-sm">暂无预览内容</p>
                    <p className="text-xs text-zinc-600 mt-2">在左侧对话中描述您想要的 UI，AI 将为您生成代码和预览</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {isLoading && (
                <div className="absolute inset-0 z-10 bg-zinc-900 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
                        <p className="text-sm text-zinc-500">正在加载预览...</p>
                    </div>
                </div>
            )}

            <Sandpack
                template="react"
                theme="dark"
                options={{
                    showNavigator: false,
                    editorHeight: "100vh",
                    showTabs: true,
                    externalResources: [
                        "https://cdn.tailwindcss.com"
                    ],
                }}
                customSetup={{
                    dependencies: {
                        "lucide-react": "latest",
                        "recharts": "latest",
                        "framer-motion": "latest",
                        "clsx": "latest",
                        "tailwind-merge": "latest",
                    },
                }}
                files={{
                    "/App.js": code,
                }}
            />
        </div>
    );
}
