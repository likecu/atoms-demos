"use client";

import { useState, useEffect, useRef } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
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

        // 根据项目类型选择模板
        const template = wsProjectType === 'html' ? 'vanilla' : 'react';

        // 构建 Sandpack 文件结构
        const sandpackFiles: Record<string, string | { code: string; hidden?: boolean }> = {};

        if (wsProjectType === 'html' && wsFiles['index.html']) {
            // HTML 项目
            sandpackFiles["/index.html"] = wsFiles['index.html'];

            // 如果有引用的 JS/JSX 文件，也添加进来
            for (const [filePath, content] of Object.entries(wsFiles)) {
                if (filePath !== 'index.html' && (filePath.endsWith('.js') || filePath.endsWith('.jsx'))) {
                    sandpackFiles[`/${filePath}`] = content;
                }
            }

            // 添加 package.json
            if (!wsFiles['package.json']) {
                sandpackFiles["/package.json"] = {
                    code: JSON.stringify({
                        "name": "workspace-preview",
                        "version": "1.0.0",
                        "main": "index.html"
                    }),
                    hidden: true
                };
            }
        } else if (wsProjectType === 'react') {
            // React 项目
            const appFile = wsFiles['src/App.jsx'] || wsFiles['src/App.tsx'] || wsFiles['App.jsx'] || wsFiles['App.tsx'];
            if (appFile) {
                sandpackFiles["/App.js"] = appFile;
            }

            // 添加标准的 React 入口文件
            sandpackFiles["/index.js"] = {
                code: `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

window.print = () => { console.log("Print blocked in preview"); };

import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
                hidden: true
            };

            sandpackFiles["/styles.css"] = {
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
            };
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
                    files={sandpackFiles}
                />
            </div>
        );
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
        </div>
    );
}
