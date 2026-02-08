"use client";

import { useState, useEffect, useRef } from "react";
import {
    SandpackProvider,
    SandpackLayout,
    SandpackPreview as SandpackPreviewPanel,
} from "@codesandbox/sandpack-react";
import { FileText, AlertCircle } from "lucide-react";

interface SharePreviewProps {
    code: string;
}

/**
 * HTML iframe 预览组件
 * 用于渲染 HTML 文档
 * @param htmlContent - HTML 内容
 */
function HtmlIframePreview({ htmlContent }: { htmlContent: string }) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [htmlContent]);

    return (
        <div className="h-screen w-screen bg-white">
            {blobUrl ? (
                <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    title="HTML Preview"
                />
            ) : (
                <div className="h-full w-full flex items-center justify-center bg-zinc-100 text-zinc-500">
                    <p className="text-sm">正在加载预览...</p>
                </div>
            )}
        </div>
    );
}

/**
 * 纯文本/代码预览组件
 * 用于显示无法渲染的代码内容
 * @param content - 文本内容
 */
function TextPreview({ content }: { content: string }) {
    return (
        <div className="h-screen w-screen bg-zinc-50 overflow-auto">
            <div className="max-w-4xl mx-auto p-8">
                {/* 提示信息 */}
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">无法渲染预览</p>
                        <p className="text-sm text-amber-700 mt-1">
                            分享的内容不是可直接渲染的 React 组件或 HTML 页面，以下为原始内容：
                        </p>
                    </div>
                </div>

                {/* 代码展示 */}
                <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-600 font-medium">分享内容</span>
                    </div>
                    <pre className="p-4 text-sm text-zinc-800 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
}

/**
 * 分享页面预览组件
 * 根据代码类型智能选择渲染方式
 * 
 * @param code - 代码内容
 */
export default function SharePreview({ code }: SharePreviewProps) {
    // 调试日志
    console.log('[SharePreview] Received code length:', code?.length || 0);
    console.log('[SharePreview] Code preview:', code?.substring(0, 100));

    // 检测代码类型
    const isReactComponent =
        code.includes('export default') ||
        code.includes('import React') ||
        code.includes('from "react"') ||
        code.includes("from 'react'");

    const isHtmlDocument =
        code.trim().startsWith('<!DOCTYPE') ||
        code.trim().startsWith('<html') ||
        (code.includes('<head>') && code.includes('<body>'));

    const isRenderable = isReactComponent || isHtmlDocument;

    console.log('[SharePreview] isReactComponent:', isReactComponent);
    console.log('[SharePreview] isHtmlDocument:', isHtmlDocument);
    console.log('[SharePreview] isRenderable:', isRenderable);

    // 如果代码为空，显示空状态
    if (!code || code.trim() === "") {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-zinc-100 text-zinc-500">
                <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                    <p className="text-lg font-medium">暂无预览内容</p>
                    <p className="text-sm text-zinc-400 mt-2">该分享链接没有可预览的内容</p>
                </div>
            </div>
        );
    }

    // 如果不是可渲染的代码，显示纯文本
    if (!isRenderable) {
        return <TextPreview content={code} />;
    }

    // HTML 文档 - 使用 iframe 渲染
    if (isHtmlDocument) {
        return <HtmlIframePreview htmlContent={code} />;
    }

    // React 组件 - 使用 Sandpack 渲染
    const files = {
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
        <div className="h-screen w-screen bg-white">
            <SandpackProvider
                template="react"
                files={files}
                theme="light"
                options={{
                    externalResources: [
                        "https://cdn.tailwindcss.com"
                    ],
                }}
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
    );
}
