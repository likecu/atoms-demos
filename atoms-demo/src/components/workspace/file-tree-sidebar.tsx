"use client";

import React, { useState } from 'react';
import { useWorkspace, FileNode } from '@/lib/workspace-context';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FileTreeSidebar() {
    const { state, dispatch } = useWorkspace();
    const { fileTree, activeFileId } = state;

    const handleFileClick = (fileId: string) => {
        dispatch({ type: 'OPEN_FILE', payload: fileId });
    };

    if (!fileTree || fileTree.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-4">
                <Folder className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">暂无文件</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-zinc-50 border-r border-zinc-200">
            <div className="p-3 border-b border-zinc-200 bg-zinc-50/50 backdrop-blur-sm">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Explorer</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {fileTree.map((node) => (
                        <FileTreeNode
                            key={node.id}
                            node={node}
                            activeFileId={activeFileId}
                            onSelect={handleFileClick}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

interface FileTreeNodeProps {
    node: FileNode;
    activeFileId: string | null;
    onSelect: (id: string) => void;
    level?: number;
}

function FileTreeNode({ node, activeFileId, onSelect, level = 0 }: FileTreeNodeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = node.type === 'directory' && node.children && node.children.length > 0;
    const isActive = node.id === activeFileId;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === 'directory') {
            setIsOpen(!isOpen);
        } else {
            onSelect(node.id);
        }
    };

    return (
        <div>
            <div
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-sm transition-colors select-none",
                    isActive ? "bg-indigo-100 text-indigo-700 font-medium" : "text-zinc-600 hover:bg-zinc-200/50",
                    level > 0 && "ml-3"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {node.type === 'directory' && (
                        hasChildren ? (
                            isOpen ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />
                        ) : <div className="w-3" />
                    )}
                </div>

                {node.type === 'directory' ? (
                    isOpen ? <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" /> : <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                    <FileIcon name={node.name} />
                )}

                <span className="truncate">{node.name}</span>
            </div>

            {isOpen && hasChildren && (
                <div className="border-l border-zinc-200 ml-[15px]">
                    {node.children!.map((child) => (
                        <FileTreeNode
                            key={child.id}
                            node={child}
                            activeFileId={activeFileId}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FileIcon({ name }: { name: string }) {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return <Code2 className="w-4 h-4 text-blue-500 shrink-0" />;
    if (name.endsWith('.css')) return <Code2 className="w-4 h-4 text-sky-400 shrink-0" />;
    if (name.endsWith('.json')) return <Code2 className="w-4 h-4 text-yellow-500 shrink-0" />;
    if (name.endsWith('.md')) return <File className="w-4 h-4 text-zinc-500 shrink-0" />;
    return <File className="w-4 h-4 text-zinc-400 shrink-0" />;
}
