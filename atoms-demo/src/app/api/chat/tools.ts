import { z } from 'zod';
import { SandboxManager } from '@/lib/sandbox/manager';
import { tool } from 'ai';

/**
 * 获取项目的 AI 工具集合
 * 使用 Vercel AI SDK 的 tool() 函数定义,完全兼容 OpenRouter Provider
 * 
 * @param projectId - 项目ID,用于识别沙盒环境
 * @returns 工具对象,包含 executeBash, readFile, writeFile, listFiles
 */
export const getTools = (projectId: string) => {
    const sandboxManager = SandboxManager.getInstance();

    return {
        /**
         * 在沙盒环境中执行 bash 命令
         */
        executeBash: tool({
            description: 'Execute a bash command in the sandbox environment. Use this to run scripts, list files, or perform system operations.',
            inputSchema: z.object({
                command: z.string().describe('The bash command to execute. e.g., "ls -la" or "python script.py"'),
            }),
            execute: async ({ command }) => {
                console.log(`[Tool:executeBash] Project ${projectId}: ${command}`);
                try {
                    const result = await sandboxManager.execCommand(projectId, ['/bin/sh', '-c', command]);

                    return {
                        success: true,
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode,
                    };
                } catch (error: any) {
                    console.error('[Tool:executeBash] Error:', error);
                    return {
                        success: false,
                        error: error.message || 'Unknown error during execution',
                    };
                }
            },
        }),

        /**
         * 从沙盒读取文件内容
         */
        readFile: tool({
            description: 'Read the contents of a file from the sandbox filesystem. Returns the file content as text.',
            inputSchema: z.object({
                path: z.string().describe('The relative or absolute path to the file to read.'),
            }),
            execute: async ({ path }) => {
                console.log(`[Tool:readFile] Project ${projectId}: ${path}`);
                try {
                    const result = await sandboxManager.execCommand(projectId, ['cat', path]);

                    if (result.exitCode !== 0) {
                        return {
                            success: false,
                            error: `File not found or unreadable: ${result.stderr}`
                        };
                    }

                    return {
                        success: true,
                        path,
                        content: result.stdout,
                        size: result.stdout.length
                    };
                } catch (error: any) {
                    console.error('[Tool:readFile] Error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        }),

        /**
         * 向沙盒写入文件
         */
        writeFile: tool({
            description: 'Write content to a file in the sandbox filesystem. Creates the file if it does not exist, or overwrites it if it does.',
            inputSchema: z.object({
                path: z.string().describe('The relative or absolute path to the file.'),
                content: z.string().describe('The content to write to the file.'),
            }),
            execute: async ({ path, content }) => {
                console.log(`[Tool:writeFile] Project ${projectId}: ${path} (${content.length} bytes)`);
                try {
                    // 使用 base64 编码避免 shell 转义问题
                    const b64Content = Buffer.from(content).toString('base64');
                    const cmd = `python3 -c "import base64; import sys; open('${path}', 'wb').write(base64.b64decode('${b64Content}'))"`;

                    const result = await sandboxManager.execCommand(projectId, ['/bin/sh', '-c', cmd]);

                    if (result.exitCode !== 0) {
                        return {
                            success: false,
                            error: result.stderr
                        };
                    }

                    return {
                        success: true,
                        path,
                        size: content.length
                    };
                } catch (error: any) {
                    console.error('[Tool:writeFile] Error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        }),

        /**
         * 列出目录下的文件
         */
        listFiles: tool({
            description: 'List files and directories in the sandbox workspace. Returns a list of file information.',
            inputSchema: z.object({
                path: z.string().optional().describe('The directory to list. Defaults to current directory (.).'),
            }),
            execute: async ({ path }) => {
                const dirPath = path || '.';
                console.log(`[Tool:listFiles] Project ${projectId}: ${dirPath}`);

                try {
                    // 使用 SandboxManager 的 listFiles 方法
                    const files = await sandboxManager.listFiles(projectId, dirPath === '.' ? '' : dirPath);

                    return {
                        success: true,
                        path: dirPath,
                        files
                    };
                } catch (error: any) {
                    console.error('[Tool:listFiles] Error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        }),
    };
};
