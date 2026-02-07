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

    // 检测代码类型
    const isReactComponent =
        code.includes('export default') ||
        code.includes('import React') ||
        code.includes('from "react"');

    const isHtmlDocument =
        code.trim().startsWith('<!DOCTYPE') ||
        code.trim().startsWith('<html') ||
        (code.includes('<head>') && code.includes('<body>'));

    const isRenderable = isReactComponent || isHtmlDocument;

    if (!isRenderable) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                <div className="text-center max-w-md px-4">
                    <p className="text-sm font-medium text-zinc-400">无法预览此类代码</p>
                    <p className="text-xs text-zinc-600 mt-2">当前生成的代码似乎不是 React 组件或 HTML 页面（可能是 Python 或其他脚本），因此无法在浏览器中直接预览。</p>
                    <pre className="mt-4 text-left bg-zinc-950 p-4 rounded-lg text-xs text-zinc-400 overflow-auto max-h-64 border border-zinc-800">
                        {code}
                    </pre>
                </div>
            </div>
        );
    }

    // 根据代码类型选择模板
    const template = isHtmlDocument ? 'vanilla' : 'react';

    // 根据模板类型准备文件结构
    const files = isHtmlDocument
        ? {
            "/index.html": code,
            "/package.json": {
                code: JSON.stringify({
                    "name": "html-preview",
                    "version": "1.0.0",
                    "main": "index.html"
                }),
                hidden: true
            }
        }
        : {
            "/App.js": code,
            "/index.js": {
                code: `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// Block window.print to prevent annoying popups in preview
window.print = () => { console.log("Print blocked in preview"); };

import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
                hidden: true
            },
            "/styles.css": {
                code: `body {
  font-family: sans-serif;
  -webkit-font-smoothing: auto;
  -moz-font-smoothing: auto;
  -moz-osx-font-smoothing: grayscale;
  font-smoothing: auto;
  text-rendering: optimizeLegibility;
  font-smooth: always;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

* {
  box-sizing: border-box;
}`,
                hidden: true
            }
        };

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
                template={template as any}
                theme="dark"
                options={{
                    showNavigator: false,
                    editorHeight: "100vh",
                    showTabs: true,
                    externalResources: [
                        "https://cdn.tailwindcss.com"
                    ],
                }}
                customSetup={template === 'react' ? {
                    dependencies: {
                        "lucide-react": "latest",
                        "recharts": "latest",
                        "framer-motion": "latest",
                        "clsx": "latest",
                        "tailwind-merge": "latest",
                    },
                } : undefined}
                files={files}
            />
        </div>
    );
}
