"use client";

import React from 'react';
import { useWorkspace } from '@/lib/workspace-context';
import { OrchestrationView } from './orchestration-view';
import { EditorView } from './editor-view';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Code2 } from 'lucide-react';

export function WorkspacePanel() {
    const { state, dispatch } = useWorkspace();
    const { mode } = state;

    return (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
            {/* Mode Switcher Toggle - Absolute positioned or top bar */}
            <div className="absolute top-4 right-4 z-50 flex bg-zinc-900/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-xl">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch({ type: 'SET_MODE', payload: 'PLANNING' })}
                    className={`h-7 px-3 text-xs gap-2 rounded-md transition-all ${mode === 'PLANNING'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Plan</span>
                </Button>
                <div className="w-px bg-zinc-800 mx-1 my-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch({ type: 'SET_MODE', payload: 'EDITING' })}
                    className={`h-7 px-3 text-xs gap-2 rounded-md transition-all ${mode === 'EDITING'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Code</span>
                </Button>
            </div>

            {/* Viewport */}
            <div className="flex-1 h-full w-full">
                {mode === 'PLANNING' && <OrchestrationView />}
                {mode === 'EDITING' && <EditorView />}
            </div>
        </div>
    );
}
