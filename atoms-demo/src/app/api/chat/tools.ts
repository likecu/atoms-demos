import { z } from 'zod';
import { SandboxManager } from '@/lib/sandbox/manager';
import { tool } from 'ai';

// Initialize SandboxManager
const sandboxManager = SandboxManager.getInstance();

// Helper to get project/user ID
// In a real app, this should come from the user session or request context
// For now, we'll use a fixed ID or pass it as an argument if the tool supports it.
// We export a factory function to create tools bound to a specific projectId.

export const getTools = (projectId: string) => {
    return {
        executeBash: tool({
            description: 'Execute a bash command in the sandbox environment. Use this to run scripts, list files, or perform system operations.',
            parameters: z.object({
                command: z.string().describe('The bash command to execute. e.g., "ls -la" or "pythonscript.py"'),
            }),
            execute: async ({ command }: { command: string }) => {
                console.log(`[Tool] Executing bash command for project ${projectId}: ${command}`);
                try {
                    // We split the command string into args for spawn-like behavior if needed, 
                    // but SandboxManager takes string[] as command parts (e.g. ['ls', '-la']).
                    // If we pass a raw string to sh -c, it handles pipes/redirects.
                    const result = await sandboxManager.execCommand(projectId, ['/bin/sh', '-c', command]);

                    return {
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode,
                    };
                } catch (error: any) {
                    return {
                        error: error.message || 'Unknown error during execution',
                    };
                }
            },
        }),

        readFile: tool({
            description: 'Read the contents of a file from the sandbox.',
            parameters: z.object({
                path: z.string().describe('The relative path to the file to read.'),
            }),
            execute: async ({ path }: { path: string }) => {
                console.log(`[Tool] Reading file for project ${projectId}: ${path}`);
                try {
                    const result = await sandboxManager.execCommand(projectId, ['cat', path]);
                    if (result.exitCode !== 0) {
                        return { error: `File not found or unreadable: ${result.stderr}` };
                    }
                    return { content: result.stdout };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),

        writeFile: tool({
            description: 'Write content to a file in the sandbox. Overwrites existing files.',
            parameters: z.object({
                path: z.string().describe('The relative path to the file.'),
                content: z.string().describe('The content to write to the file.'),
            }),
            execute: async ({ path, content }: { path: string; content: string }) => {
                console.log(`[Tool] Writing file for project ${projectId}: ${path}`);
                try {
                    // Encode content to base64 to avoid shell escaping issues
                    const b64Content = Buffer.from(content).toString('base64');
                    const cmd = `python3 -c "import base64; import sys; open('${path}', 'wb').write(base64.b64decode('${b64Content}'))"`;

                    const result = await sandboxManager.execCommand(projectId, ['/bin/sh', '-c', cmd]);

                    if (result.exitCode !== 0) {
                        return { success: false, error: result.stderr };
                    }
                    return { success: true, path };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            },
        }),

        listFiles: tool({
            description: 'List files and directories in the current workspace.',
            parameters: z.object({
                path: z.string().optional().describe('The directory to list. Defaults to current directory.'),
            }),
            execute: async ({ path }: { path?: string }) => {
                try {
                    // We can use the optimized listFiles from SandboxManager
                    const dirPath = path || '.';
                    const files = await sandboxManager.listFiles(projectId, dirPath === '.' ? '' : dirPath);
                    return { files };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),
    };
};
