"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface FilePreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    content: string | null;
    isLoading: boolean;
}

export function FilePreviewDialog({
    isOpen,
    onClose,
    fileName,
    content,
    isLoading,
}: FilePreviewDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{fileName}</DialogTitle>
                    <DialogDescription className="hidden">
                        File preview for {fileName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative bg-zinc-950 text-zinc-300">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="p-4">
                                <pre className="font-mono text-sm whitespace-pre-wrap break-all">
                                    {content || "No content"}
                                </pre>
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
