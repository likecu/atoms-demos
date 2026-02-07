'use server'

import { SandboxManager } from '../sandbox/manager';
import { getCurrentUserId } from '../supabase-server';

/**
 * Execute a shell command in the project's sandbox
 */
export async function execSandboxCommand(projectId: string, command: string) {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('Unauthorized');
    }

    // TODO: verify user has access to project

    const manager = SandboxManager.getInstance();
    // Provide basic safety: ensure container exists for this project
    await manager.getOrCreateSandbox(projectId);

    // Split command string into array for better safety if possible, 
    // but for a shell, we often want to run "sh -c 'full command'"
    const cmdArray = ['/bin/sh', '-c', command];

    try {
        const result = await manager.execCommand(projectId, cmdArray);
        return result;
    } catch (error) {
        console.error('Sandbox execution error:', error);
        return { stdout: '', stderr: String(error), exitCode: -1 };
    }
}

/**
 * List files in the project's workspace
 */
export async function listWorkspaceFiles(projectId: string, subPath: string = '') {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('Unauthorized');
    }

    // Prevent directory traversal
    if (subPath.includes('..')) {
        throw new Error('Invalid path');
    }

    const manager = SandboxManager.getInstance();
    // Ensure init
    await manager.initWorkspace(projectId);

    return await manager.listFiles(projectId, subPath);
}
