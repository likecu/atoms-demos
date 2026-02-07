"use client";

import { useEffect, useState } from "react";
import { Folder, File, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProjectFiles, FileItem, getProjectFileContent } from "@/lib/actions/files";
import { FilePreviewDialog } from "./file-preview-dialog";

interface FileExplorerProps {
    projectId: string;
}

export function FileExplorer({ projectId }: FileExplorerProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Preview state
    const [previewFile, setPreviewFile] = useState<{ name: string; content: string | null } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const loadFiles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getProjectFiles(projectId);
            setFiles(data);
        } catch (err) {
            setError("加载文件失败");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileClick = async (file: FileItem) => {
        if (file.type === 'directory') return;

        setIsPreviewOpen(true);
        setPreviewFile({ name: file.name, content: null });
        setIsLoadingPreview(true);

        try {
            const content = await getProjectFileContent(projectId, file.name);
            setPreviewFile({ name: file.name, content });
        } catch (err) {
            console.error("Failed to load file content:", err);
            setPreviewFile({ name: file.name, content: "Error loading file content" });
        } finally {
            setIsLoadingPreview(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [projectId]);

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-sm text-zinc-700">Exploer</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={loadFiles}
                    disabled={isLoading}
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-700"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="sr-only">刷新</span>
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {error && (
                        <div className="p-4 text-sm text-red-500 text-center">
                            {error}
                        </div>
                    )}

                    {!isLoading && !error && files.length === 0 && (
                        <div className="p-8 text-center text-sm text-zinc-500">
                            暂无文件
                        </div>
                    )}

                    {files.map((file) => (
                        <div
                            key={file.name}
                            onClick={() => handleFileClick(file)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 rounded-md hover:bg-white hover:shadow-sm cursor-pointer transition-all"
                        >
                            {file.type === 'directory' ? (
                                <Folder className="w-4 h-4 text-blue-400" />
                            ) : (
                                <File className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="truncate">{file.name}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <FilePreviewDialog
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                fileName={previewFile?.name || ""}
                content={previewFile?.content ?? null}
                isLoading={isLoadingPreview}
            />
        </div>
    );
}
