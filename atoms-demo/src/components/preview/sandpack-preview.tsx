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

        if (wsProjectType === 'html') {
            // HTML 项目 - 保持原有逻辑，但支持更多文件
            for (const [filePath, content] of Object.entries(wsFiles)) {
                sandpackFiles[`/${filePath}`] = content;
            }

            // 添加 package.json 如果不存在
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
            // React 项目 - 动态映射所有文件
            for (const [filePath, content] of Object.entries(wsFiles)) {
                // 如果是 package.json，我们需要确保它包含 react 依赖
                if (filePath === 'package.json') {
                    try {
                        const pkg = JSON.parse(content);
                        const dependencies = pkg.dependencies || {};
                        const devDependencies = pkg.devDependencies || {};

                        // 检查是否缺失关键依赖
                        const hasReact = dependencies['react'] || devDependencies['react'];
                        const hasReactDOM = dependencies['react-dom'] || devDependencies['react-dom'];

                        if (!hasReact || !hasReactDOM) {
                            // 混合原有依赖和 React 依赖
                            pkg.dependencies = {
                                ...dependencies,
                                "react": dependencies['react'] || "^18.2.0",
                                "react-dom": dependencies['react-dom'] || "^18.2.0",
                                "react-scripts": "5.0.1" // 添加 react-scripts 以防万一
                            };
                            sandpackFiles[`/${filePath}`] = JSON.stringify(pkg, null, 2);
                        } else {
                            sandpackFiles[`/${filePath}`] = content;
                        }
                    } catch (e) {
                        // 解析失败，使用原始内容（虽然可能还是坏的）
                        console.error("Failed to parse user package.json", e);
                        sandpackFiles[`/${filePath}`] = content;
                    }
                } else {
                    sandpackFiles[`/${filePath}`] = content;
                }
            }

            // 如果没有 package.json，创建一个默认的
            if (!sandpackFiles['/package.json']) {
                sandpackFiles["/package.json"] = {
                    code: JSON.stringify({
                        "name": "react-app",
                        "version": "1.0.0",
                        "main": "/index.js",
                        "dependencies": {
                            "react": "^18.2.0",
                            "react-dom": "^18.2.0",
                            "lucide-react": "latest",
                            "recharts": "latest",
                            "framer-motion": "latest",
                            "clsx": "latest",
                            "tailwind-merge": "latest"
                        }
                    }),
                    hidden: true
                };
            }

            // 查找入口文件
            const entryFiles = ['src/index.jsx', 'src/index.tsx', 'src/main.jsx', 'src/main.tsx', 'index.jsx', 'index.tsx'];
            const foundEntry = entryFiles.find(f => wsFiles[f]);

            // 如果找到入口文件，创建引导 index.js
            if (foundEntry) {
                // Sandpack 默认入口是 /index.js，我们需要它引用用户的入口
                if (!sandpackFiles['/index.js']) {
                    sandpackFiles["/index.js"] = {
                        code: `import "./${foundEntry}";`,
                        hidden: true
                    };
                }
            } else {
                // 如果没有找到显式入口，尝试查找 App 组件并使用旧逻辑封装
                const appFile = wsFiles['src/App.jsx'] || wsFiles['src/App.tsx'] || wsFiles['App.jsx'] || wsFiles['App.tsx'];
                const appPath = wsFiles['src/App.jsx'] ? './src/App' :
                    wsFiles['src/App.tsx'] ? './src/App' :
                        wsFiles['App.jsx'] ? './App' : './App';

                if (appFile) {
                    sandpackFiles["/index.js"] = {
                        code: `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

window.print = () => { console.log("Print blocked in preview"); };

import App from "${appPath}";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
                        hidden: true
                    };
                }
            }

            // 确保有 styles.css (如果用户没提供)
            if (!sandpackFiles['/styles.css'] && !sandpackFiles['/src/styles.css'] && !sandpackFiles['/src/index.css']) {
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
