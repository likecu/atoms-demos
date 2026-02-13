"use client";

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

// --- Types ---

export type WorkspaceMode = 'PLANNING' | 'EDITING';

export interface AgentNode {
    id: string;
    name: string;
    role: string;
    status: 'idle' | 'working' | 'completed' | 'error';
    currentTask?: string;
    avatar?: string;
    logs?: any[];  // 该代理的所有日志（AICallLog类型，避免循环依赖使用any）
}

export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    content?: string; // Optional cached content
}

export interface WorkspaceState {
    mode: WorkspaceMode;

    // Orchestration Mode State
    agents: AgentNode[];

    // Editor Mode State
    fileTree: FileNode[];
    activeFileId: string | null;
    openFiles: string[]; // List of file paths/ids

    // Real-time Streaming State
    editorStream: {
        isStreaming: boolean;
        activeLine: number;
        contentBuffer: string;
        targetFileId: string | null;
    };
}

// --- Actions ---

type Action =
    | { type: 'SET_MODE'; payload: WorkspaceMode }
    | { type: 'UPDATE_AGENTS'; payload: AgentNode[] }
    | { type: 'UPDATE_AGENT_STATUS'; payload: { agentId: string; status: AgentNode['status']; currentTask?: string } }
    | { type: 'SET_FILE_TREE'; payload: FileNode[] }
    | { type: 'OPEN_FILE'; payload: string }
    | { type: 'CLOSE_FILE'; payload: string }
    | { type: 'SET_ACTIVE_FILE'; payload: string }
    | { type: 'START_STREAMING'; payload: { fileId: string } }
    | { type: 'APPEND_STREAM_CONTENT'; payload: string }
    | { type: 'STOP_STREAMING' };

// --- Reducer ---

const initialState: WorkspaceState = {
    mode: 'EDITING', // Default to code editing
    agents: [],
    fileTree: [],
    activeFileId: null,
    openFiles: [],
    editorStream: {
        isStreaming: false,
        activeLine: 0,
        contentBuffer: '',
        targetFileId: null,
    },
};

function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.payload };

        case 'UPDATE_AGENTS':
            return { ...state, agents: action.payload };

        case 'UPDATE_AGENT_STATUS':
            return {
                ...state,
                agents: state.agents.map(agent =>
                    agent.id === action.payload.agentId
                        ? { ...agent, status: action.payload.status, currentTask: action.payload.currentTask }
                        : agent
                )
            };

        case 'SET_FILE_TREE':
            return { ...state, fileTree: action.payload };

        case 'OPEN_FILE':
            if (state.openFiles.includes(action.payload)) {
                return { ...state, activeFileId: action.payload };
            }
            return {
                ...state,
                openFiles: [...state.openFiles, action.payload],
                activeFileId: action.payload
            };

        case 'CLOSE_FILE':
            const newOpenFiles = state.openFiles.filter(id => id !== action.payload);
            let newActiveFileId = state.activeFileId;
            if (state.activeFileId === action.payload) {
                newActiveFileId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
            }
            return {
                ...state,
                openFiles: newOpenFiles,
                activeFileId: newActiveFileId
            };

        case 'SET_ACTIVE_FILE':
            return { ...state, activeFileId: action.payload };

        case 'START_STREAMING':
            return {
                ...state,
                mode: 'EDITING', // Auto-switch to editing
                activeFileId: action.payload.fileId, // Auto-focus file
                editorStream: {
                    isStreaming: true,
                    activeLine: 0,
                    contentBuffer: '',
                    targetFileId: action.payload.fileId
                }
            };

        case 'APPEND_STREAM_CONTENT':
            return {
                ...state,
                editorStream: {
                    ...state.editorStream,
                    contentBuffer: state.editorStream.contentBuffer + action.payload
                }
            };

        case 'STOP_STREAMING':
            return {
                ...state,
                editorStream: {
                    ...state.editorStream,
                    isStreaming: false,
                    contentBuffer: '', // Clear buffer after commit (assuming committed elsewhere)
                    targetFileId: null
                }
            };

        default:
            return state;
    }
}

// --- Context ---

interface WorkspaceContextType {
    state: WorkspaceState;
    dispatch: React.Dispatch<Action>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(workspaceReducer, initialState);

    return (
        <WorkspaceContext.Provider value={{ state, dispatch }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
}
