"use client";

import React, { useEffect, useRef } from 'react';
import { useWorkspace } from '@/lib/workspace-context';
import { SandpackProvider, SandpackCodeEditor, SandpackLayout, useSandpack } from "@codesandbox/sandpack-react";
import { Loader2, Terminal } from 'lucide-react';

interface StreamingEditorProps {
    fileId: string;
    content: string;
    isStreaming: boolean;
}

export function StreamingEditor({ fileId, content, isStreaming }: StreamingEditorProps) {
    // Determine language based on file extension
    const validExtensions = ['js', 'ts', 'jsx', 'tsx', 'css', 'html', 'json'];
    const ext = fileId.split('.').pop() || 'js';
    const filePath = fileId.startsWith('/') ? fileId : `/${fileId}`;

    return (
        <div className="h-full w-full relative">
            <SandpackProvider
                template="react"
                theme="dark"
                files={{
                    [filePath]: {
                        code: content,
                        active: true
                    }
                }}
                options={{
                    visibleFiles: [filePath],
                    activeFile: filePath
                }}
            >
                <SandpackLayout className="!h-full !block !rounded-none !border-0">
                    <SandpackCodeEditor
                        showTabs={false}
                        showLineNumbers={true}
                        showInlineErrors={false}
                        wrapContent={true}
                        readOnly={true} // Agent writes, user watches (for now)
                        className="!h-full font-mono"
                    />
                </SandpackLayout>

                {/* Scroll Controller & Cursor Effect Overlay would go here if we had low-level access */}
                <AutoScrollTrigger content={content} isStreaming={isStreaming} />
            </SandpackProvider>

            {/* Floating Status Indicator */}
            {isStreaming && (
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Agent Writing...</span>
                </div>
            )}
        </div>
    );
}

// Helper component to handle auto-scrolling by interacting with Sandpack instance if needed, 
// or simply by scrolling the active element.
function AutoScrollTrigger({ content, isStreaming }: { content: string, isStreaming: boolean }) {
    const { sandpack } = useSandpack();

    useEffect(() => {
        if (isStreaming) {
            // Attempt to find the scrollable container in Sandpack's shadow DOM or structure
            // This is a bit hacky as Sandpack doesn't expose scroll ref directly
            const editors = document.querySelectorAll('.cm-scroller');
            editors.forEach(el => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [content, isStreaming]);

    return null;
}
