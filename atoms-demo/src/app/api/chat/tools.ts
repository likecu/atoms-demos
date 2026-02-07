import { z } from 'zod';
import { SandboxManager } from '@/lib/sandbox/manager';
import { tool } from 'ai';

const sandboxManager = SandboxManager.getInstance();

/**
 * 安全地将任意类型的值转换为字符串
 * 处理数组、对象、数字等类型的转换
 * 
 * @param value - 输入值
 * @param defaultValue - 转换失败时的默认值
 * @returns 转换后的字符串
 * 
 * @example
 * ```typescript
 * safeToString('hello') // 'hello'
 * safeToString(['a', 'b', 'c']) // 'a b c'
 * safeToString(123) // '123'
 * safeToString(null, 'default') // 'default'
 * ```
 */
function safeToString(value: unknown, defaultValue: string = ''): string {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    
    if (typeof value === 'string') {
        return value;
    }
    
    if (Array.isArray(value)) {
        return value
            .map(item => safeToString(item, ''))
            .filter(Boolean)
            .join(' ');
    }
    
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    
    return String(value);
}

/**
 * 安全地将值转换为可选字符串路径
 * 
 * @param value - 输入值
 * @returns 转换后的路径或 undefined
 */
function safeToOptionalPath(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    
    const str = safeToString(value);
    if (!str || str.trim() === '') {
        return undefined;
    }
    
    return str.trim();
}

/**
 * 安全地将值转换为必需字符串
 * 
 * @param value - 输入值
 * @param fieldName - 字段名称（用于错误消息）
 * @returns 转换后的字符串
 * @throws 当值无法转换时抛出错误
 */
function safeToRequiredString(value: unknown, fieldName: string): string {
    const str = safeToString(value);
    
    if (!str || str.trim() === '') {
        throw new Error(`Required field '${fieldName}' cannot be empty`);
    }
    
    return str;
}

/**
 * 获取工具配置
 * 创建绑定到特定项目 ID 的工具实例
 * 
 * @param projectId - 项目 ID
 * @returns 工具对象集合
 * 
 * @example
 * ```typescript
 * const tools = getTools('project-123');
 * const result = await tools.executeBash({ command: 'ls -la' });
 * ```
 */
export const getTools = (projectId: string) => {
    return {
        executeBash: tool({
            description: 'Execute a bash command in the sandbox environment. Use this to run scripts, list files, or perform system operations.',
            parameters: z.object({
                command: z.union([
                    z.string(),
                    z.array(z.string())
                ]).describe('The bash command to execute. Accepts either a string (e.g., "ls -la") or an array (e.g., ["ls", "-la"]).'),
            }),
            execute: async ({ command }: { command: string | string[] }) => {
                const cmdString = Array.isArray(command) ? command.join(' ') : command;
                console.log(`[Tool] Executing bash command for project ${projectId}: ${cmdString}`);
                
                try {
                    const result = await sandboxManager.execCommand(projectId, ['/bin/sh', '-c', cmdString]);

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
                path: z.union([
                    z.string(),
                    z.array(z.string())
                ]).describe('The relative path to the file to read. Can be a string or an array of path parts.'),
            }),
            execute: async ({ path }: { path: string | string[] }) => {
                const pathString = Array.isArray(path) ? path.join('/') : path;
                console.log(`[Tool] Reading file for project ${projectId}: ${pathString}`);
                
                try {
                    const result = await sandboxManager.execCommand(projectId, ['cat', pathString]);
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
                path: z.union([
                    z.string(),
                    z.array(z.string())
                ]).describe('The relative path to the file.'),
                content: z.union([
                    z.string(),
                    z.array(z.string())
                ]).describe('The content to write to the file.'),
            }),
            execute: async ({ path, content }: { path: string | string[]; content: string | string[] }) => {
                const pathString = Array.isArray(path) ? path.join('/') : path;
                const contentString = Array.isArray(content) ? content.join('\n') : content;
                console.log(`[Tool] Writing file for project ${projectId}: ${pathString}`);
                
                try {
                    const b64Content = Buffer.from(contentString).toString('base64');
                    const cmd = `python3 -c "import base64; import sys; open('${pathString}', 'wb').write(base64.b64decode('${b64Content}'))"`;

                    const result = await sandboxManager.execCommand(projectId, ['/bin/sh', '-c', cmd]);

                    if (result.exitCode !== 0) {
                        return { success: false, error: result.stderr };
                    }
                    return { success: true, path: pathString };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            },
        }),

        listFiles: tool({
            description: 'List files and directories in the current workspace.',
            parameters: z.object({
                path: z.union([
                    z.string(),
                    z.array(z.string())
                ]).optional().describe('The directory to list. Defaults to current directory.'),
            }),
            execute: async ({ path }: { path?: string | string[] }) => {
                try {
                    const dirPath = path 
                        ? (Array.isArray(path) ? path.join('/') : path)
                        : '.';
                    console.log(`[Tool] Listing files for project ${projectId}: ${dirPath}`);
                    
                    const files = await sandboxManager.listFiles(projectId, dirPath === '.' ? '' : dirPath);
                    return { files };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),
    };
};
