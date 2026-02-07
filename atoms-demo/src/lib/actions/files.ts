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
    console.time('getProjectFiles-total')
    console.time('getProjectFiles-auth')
    const userId = await getCurrentUserId();
    console.timeEnd('getProjectFiles-auth')
    if (!userId) {
        throw new Error('Unauthorized');
    }

    const manager = SandboxManager.getInstance();

    try {
        console.time('getProjectFiles-initWorkspace')
        await manager.initWorkspace(projectId);
        console.timeEnd('getProjectFiles-initWorkspace')

        console.time('getProjectFiles-listFilesDetailed')
        const entries = await manager.listFilesDetailed(projectId, subPath);
        console.timeEnd('getProjectFiles-listFilesDetailed')

        const result = entries.map(entry => ({
            name: entry.name,
            type: (entry.isDirectory ? 'directory' : 'file') as 'directory' | 'file'
        })).sort((a, b) => {
            // Directories first
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });
        console.timeEnd('getProjectFiles-total')
        return result
    } catch (error) {
        console.error('Error listing files:', error);
        console.timeEnd('getProjectFiles-total')
        return [];
    }
}

/**
 * Get the content of a specific file in the project
 * @param projectId - The project ID
 * @param filePath - The relative path to the file
 */
export async function getProjectFileContent(projectId: string, filePath: string): Promise<string> {
    console.time('getProjectFileContent-total')
    console.time('getProjectFileContent-auth')
    const userId = await getCurrentUserId();
    console.timeEnd('getProjectFileContent-auth')
    if (!userId) {
        throw new Error('Unauthorized');
    }

    const manager = SandboxManager.getInstance();

    try {
        // Ensure workspace is initialized (though likely already is if listing files)
        console.time('getProjectFileContent-initWorkspace')
        await manager.initWorkspace(projectId);
        console.timeEnd('getProjectFileContent-initWorkspace')

        console.time('getProjectFileContent-readFile')
        const content = await manager.readFile(projectId, filePath);
        console.timeEnd('getProjectFileContent-readFile')
        console.timeEnd('getProjectFileContent-total')
        return content
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        console.timeEnd('getProjectFileContent-total')
        throw new Error('Failed to read file content');
    }
}
