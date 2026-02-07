'use server'

import { SandboxManager } from '../sandbox/manager';
import { getCurrentUserId } from '../supabase-server';

export interface FileItem {
    name: string;
    type: 'file' | 'directory';
}

/**
 * List files in the project's workspace
 * @param projectId - The project ID (which maps to the workspace directory)
 * @param subPath - Optional subdirectory path
 */
export async function getProjectFiles(projectId: string, subPath: string = ''): Promise<FileItem[]> {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('Unauthorized');
    }

    const manager = SandboxManager.getInstance();

    try {
        await manager.initWorkspace(projectId);

        const entries = await manager.listFilesDetailed(projectId, subPath);

        return entries.map(entry => ({
            name: entry.name,
            type: (entry.isDirectory ? 'directory' : 'file') as 'directory' | 'file'
        })).sort((a, b) => {
            // Directories first
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error('Error listing files:', error);
        return [];
    }
}
