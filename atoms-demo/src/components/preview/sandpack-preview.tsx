"use client";

import { useState, useEffect, useRef } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import ClientReactPreview from "./client-react-preview";
import { useAppContext } from "@/lib/context";
import { Loader2 } from "lucide-react";

/**
 * Sandpack 预览组件属性
 */
interface SandpackPreviewProps {
    projectId?: string;
}

/**
 * 工作区文件数据结构
 */
interface WorkspaceFiles {
    files: Record<string, string>;
    entryFile: string | null;
    projectType: 'html' | 'react' | null;
    isEmpty: boolean;
}

/**
 * HTML iframe 预览组件属性
 */
interface HtmlIframePreviewProps {
    files: Record<string, string>;
    isLoading: boolean;
}

/**
 * HTML iframe 预览组件
 * 用于渲染使用 CDN 加载 React/Babel 的 HTML 项目
 * @param files - 工作区文件内容
 * @param isLoading - 是否正在加载
 */
function HtmlIframePreview({ files, isLoading }: HtmlIframePreviewProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!files['index.html']) return;

        // 获取 HTML 内容
        let htmlContent = files['index.html'];

        // 内联 CSS 文件
        const cssFiles = Object.entries(files).filter(([path]) => path.endsWith('.css'));
        for (const [cssPath, cssContent] of cssFiles) {
            // 替换 <link href="xxx.css"> 为内联 <style>
            const linkRegex = new RegExp(`<link[^>]*href=["']${cssPath}["'][^>]*>`, 'gi');
            if (linkRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(linkRegex, `<style>${cssContent}</style>`);
            } else {
                // 如果没有找到对应的 link 标签，在 head 中添加
                htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
            }
        }

        // 内联 JS 文件（非 CDN）
        const jsFiles = Object.entries(files).filter(([path]) =>
            (path.endsWith('.js') || path.endsWith('.jsx')) &&
            !path.includes('node_modules')
        );
        for (const [jsPath, jsContent] of jsFiles) {
            // 替换 <script src="xxx.js"> 为内联 <script>
            const scriptRegex = new RegExp(`<script[^>]*src=["']${jsPath}["'][^>]*></script>`, 'gi');
            if (scriptRegex.test(htmlContent)) {
                // 对于 JSX 文件，保持 type="text/babel"
                const isBabel = jsPath.endsWith('.jsx');
                const scriptType = isBabel ? ' type="text/babel"' : '';
                htmlContent = htmlContent.replace(scriptRegex, `<script${scriptType}>${jsContent}</script>`);
            }
        }

        // 创建 Blob URL
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        // 清理旧的 Blob URL
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [files]);

    return (
        <div className="h-full w-full relative bg-white">
            {isLoading && (
                <div className="absolute inset-0 z-10 bg-zinc-900 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
                        <p className="text-sm text-zinc-500">正在加载预览...</p>
                    </div>
                </div>
            )}

            {blobUrl ? (
                <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    title="HTML Preview"
                />
            ) : (
                <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                    <p className="text-sm">无法加载 HTML 预览</p>
                </div>
            )}
        </div>
    );
}

export default function SandpackPreview({ projectId }: SandpackPreviewProps) {
    const { code } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFiles | null>(null);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 从工作区 API 获取文件
    useEffect(() => {
        if (!projectId) return;

        async function fetchWorkspaceFiles() {
            try {
                const response = await fetch(`/api/preview?projectId=${projectId}`);
                if (response.ok) {
                    const data: WorkspaceFiles = await response.json();
                    setWorkspaceFiles(data);
                }
            } catch (error) {
                console.error('[SandpackPreview] Failed to fetch workspace files:', error);
            }
        }

        fetchWorkspaceFiles();
    }, [projectId]);

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

    // 优先使用工作区文件，回退到 code 状态
    const hasWorkspaceFiles = workspaceFiles && !workspaceFiles.isEmpty && Object.keys(workspaceFiles.files).length > 0;
    const hasCode = code && code.trim() !== "";

    // 如果既没有工作区文件也没有代码，显示空状态
    if (!hasWorkspaceFiles && !hasCode) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                <div className="text-center max-w-md px-4">
                    <p className="text-sm">暂无预览内容</p>
                    <p className="text-xs text-zinc-600 mt-2">在左侧对话中描述您想要的 UI，AI 将为您生成代码和预览</p>
                </div>
            </div>
        );
    }

    // 如果有工作区文件，使用工作区文件
    if (hasWorkspaceFiles && workspaceFiles) {
        const { files: wsFiles, projectType: wsProjectType, entryFile } = workspaceFiles;

        // Debug logging
        console.log('[SandpackPreview] projectType:', wsProjectType);
        console.log('[SandpackPreview] hasIndexHtml:', !!wsFiles['index.html']);
        console.log('[SandpackPreview] fileKeys:', Object.keys(wsFiles).slice(0, 10));

        // HTML 项目 - 使用 iframe 直接渲染，避免 Sandpack 超时问题
        if (wsProjectType === 'html' && wsFiles['index.html']) {
            console.log('[SandpackPreview] Using HtmlIframePreview for HTML project');
            return (
                <HtmlIframePreview
                    files={wsFiles}
                    isLoading={isLoading}
                />
            );
        }


        if (wsProjectType === 'react') {
            // For ClientReactPreview, we just need to pass the files map.
            // It will look for /App.js or /App.tsx or similar.
            // We might need to ensure the keys start with / if they don't? 
            // The browser preview component handles simple structure.

            // Normalize keys to start with / if needed, though ClientReactPreview logic 
            // currently looks for specific keys. 
            // Let's pass the raw files and let ClientReactPreview handle it or adjust here.

            // Adjust files for ClientReactPreview
            const previewFiles: Record<string, string> = {};
            for (const [key, val] of Object.entries(wsFiles)) {
                // Ensure keys start with /
                const newKey = key.startsWith('/') ? key : `/${key}`;
                previewFiles[newKey] = val;
            }

            return <ClientReactPreview files={previewFiles} code="" />;
        }

        /* 
        // Fallback or old Sandpack logic (commented out or removed)
        const template = 'react';
        // ... (rest of old logic)
        */

        // Return null or fallback if we reach here (shouldn't for react type)
        return null;
    }

    // 回退逻辑：使用 code 状态（原有逻辑）
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
            */
            return <ClientReactPreview code={code} />;
        </div>
    );
}
