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
