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

/**
 * Get the content of a specific file in the project
 * @param projectId - The project ID
 * @param filePath - The relative path to the file
 */
export async function getProjectFileContent(projectId: string, filePath: string): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('Unauthorized');
    }

    const manager = SandboxManager.getInstance();

    try {
        // Ensure workspace is initialized (though likely already is if listing files)
        await manager.initWorkspace(projectId);
        return await manager.readFile(projectId, filePath);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw new Error('Failed to read file content');
    }
}
