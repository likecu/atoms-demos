"use client";

import React from 'react';
import { useWorkspace } from '@/lib/workspace-context';
import { FileTreeSidebar } from './file-tree-sidebar';
import { StreamingEditor } from './streaming-editor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EditorView() {
    const { state, dispatch } = useWorkspace();
    const { activeFileId, openFiles, editorStream, fileTree } = state;

    // Helper to find file content
    const getFileContent = (id: string | null) => {
        if (!id) return '';
        // If streaming, use buffer
        if (editorStream.isStreaming && editorStream.targetFileId === id) {
            return editorStream.contentBuffer;
        }
        // Otherwise find in tree (simple search for now, assumes flat or specific structure matching)
        // In real app, we need a lookup map or recursive search.
        // For MVP, if file is not found, return empty or placeholder.
        return findContent(fileTree, id) || '// File content not loaded';
    };

    const findContent = (nodes: any[], id: string): string | null => {
        for (const node of nodes) {
            if (node.id === id) return node.content || '';
            if (node.children) {
                const found = findContent(node.children, id);
                if (found !== null) return found;
            }
        }
        return null;
    };

    const handleTabClick = (fileId: string) => {
        dispatch({ type: 'SET_ACTIVE_FILE', payload: fileId });
    };

    const handleCloseTab = (e: React.MouseEvent, fileId: string) => {
        e.stopPropagation();
        dispatch({ type: 'CLOSE_FILE', payload: fileId });
    };

    return (
        <div className="h-full w-full flex bg-zinc-900 border-l border-zinc-800">
            {/* Left Sidebar: File Explorer */}
            <div className="w-64 flex-shrink-0 h-full border-r border-zinc-800 bg-zinc-950">
                <FileTreeSidebar />
            </div>

            {/* Main Area: Tabs & Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-900">
                {/* Tab Bar */}
                {openFiles.length > 0 && (
                    <div className="flex items-center bg-zinc-950 border-b border-zinc-800 overflow-x-auto no-scrollbar">
                        {openFiles.map(fileId => (
                            <div
                                key={fileId}
                                onClick={() => handleTabClick(fileId)}
                                className={`
                                    group flex items-center gap-2 px-3 py-2.5 text-xs border-r border-zinc-800 cursor-pointer select-none min-w-[120px] max-w-[200px]
                                    ${activeFileId === fileId ? 'bg-zinc-900 text-zinc-100 border-t-2 border-t-indigo-500' : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'}
                                `}
                            >
                                <File className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate flex-1">{fileId}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-4 w-4 opacity-0 group-hover:opacity-100 p-0 hover:bg-zinc-800 rounded-sm ${activeFileId === fileId ? 'text-zinc-400' : 'text-zinc-600'}`}
                                    onClick={(e) => handleCloseTab(e, fileId)}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Editor Surface */}
                <div className="flex-1 overflow-hidden relative">
                    {activeFileId ? (
                        <StreamingEditor
                            fileId={activeFileId}
                            content={getFileContent(activeFileId)}
                            isStreaming={editorStream.isStreaming && editorStream.targetFileId === activeFileId}
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-700 bg-zinc-900/50">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                                    <File className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-sm font-medium">No file is open</p>
                                <p className="text-xs mt-1 opacity-50">Select a file from the explorer to view</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
