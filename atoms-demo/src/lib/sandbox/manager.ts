import Docker from 'dockerode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SANDBOX_CONFIG } from './config';

// Initialize Docker client
// On Mac/Linux, this usually works with default socket
const docker = new Docker();

export class SandboxManager {
    private static instance: SandboxManager;

    private constructor() { }

    public static getInstance(): SandboxManager {
        if (!SandboxManager.instance) {
            SandboxManager.instance = new SandboxManager();
        }
        return SandboxManager.instance;
    }

    /**
     * Ensure the workspace directory exists for the user
     */
    async initWorkspace(userId: string): Promise<string> {
        const workspacePath = path.join(SANDBOX_CONFIG.HOST_WORKSPACES_DIR, userId);
        try {
            await fs.mkdir(workspacePath, { recursive: true });
            // Create a default readme
            const readmePath = path.join(workspacePath, 'README.md');
            try {
                await fs.access(readmePath);
            } catch {
                await fs.writeFile(
                    readmePath,
                    `# Workspace for User ${userId}\n\nThis is your private sandbox environment.`
                );
            }
            return workspacePath;
        } catch (error) {
            console.error(`Failed to init workspace for ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get or create a sandbox container for the user
     */
    async getOrCreateSandbox(userId: string): Promise<Docker.Container> {
        const containerName = `sandbox-${userId}`;
        const workspacePath = await this.initWorkspace(userId);

        // Check if container exists
        const containers = await docker.listContainers({
            all: true,
            filters: { name: [containerName] },
        });

        if (containers.length > 0) {
            const containerInfo = containers[0];
            const container = docker.getContainer(containerInfo.Id);

            if (containerInfo.State !== 'running') {
                await container.start();
            }
            return container;
        }

        // Create new container
        // Note: We mount the host path to /workspace in the container
        const container = await docker.createContainer({
            Image: SANDBOX_CONFIG.IMAGE_NAME,
            name: containerName,
            Tty: true, // Keep it running
            Cmd: ['/bin/sh'], // Default command to keep it alive
            WorkingDir: '/workspace',
            HostConfig: {
                Binds: [`${workspacePath}:/workspace`],
                Memory: SANDBOX_CONFIG.MEMORY_LIMIT,
                CpuShares: SANDBOX_CONFIG.CPU_SHARES,
                // AutoRemove: true, // Don't auto-remove so we can reuse it
            },
        });

        await container.start();
        return container;
    }

    /**
     * Execute a command in the user's sandbox
     */
    async execCommand(userId: string, command: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        const container = await this.getOrCreateSandbox(userId);

        const exec = await container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true,
        });

        // Use hijack to get the multiplexed stream
        const stream = await exec.start({ hijack: true, stdin: false });

        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';

            // Use the container's modem to demux the stream
            // We cast to any because modem is not exposed in the TypeScript definition
            (container as any).modem.demuxStream(stream, {
                write: (chunk: Buffer) => {
                    stdout += chunk.toString('utf-8');
                }
            }, {
                write: (chunk: Buffer) => {
                    stderr += chunk.toString('utf-8');
                }
            });

            stream.on('end', async () => {
                try {
                    const inspect = await exec.inspect();

                    resolve({
                        stdout: stdout.trim(), // Trim output for cleaner results
                        stderr: stderr.trim(),
                        exitCode: inspect.ExitCode || 0,
                    });
                } catch (e) {
                    console.error('[Exec] Failed to inspect exec instance:', e);
                    resolve({
                        stdout,
                        stderr,
                        exitCode: -1,
                    });
                }
            });

            stream.on('error', (err) => {
                console.error('[Exec] Stream error:', err);
                reject(err);
            });
        });
    }

    /**
     * Listing files in the user's workspace (Host side optimization)
     */
    async listFiles(userId: string, subPath: string = ''): Promise<string[]> {
        const workspacePath = path.join(SANDBOX_CONFIG.HOST_WORKSPACES_DIR, userId, subPath);
        try {
            return await fs.readdir(workspacePath);
        } catch (e) {
            return [];
        }
    }

    /**
     * List files with detailed stats (name, isDirectory)
     */
    async listFilesDetailed(userId: string, subPath: string = ''): Promise<{ name: string; isDirectory: boolean }[]> {
        const workspacePath = path.join(SANDBOX_CONFIG.HOST_WORKSPACES_DIR, userId, subPath);
        try {
            const entries = await fs.readdir(workspacePath, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory()
            }));
        } catch (e) {
            console.error(`Failed to list files detailed for ${userId}:`, e);
            throw e;
        }
    }
}
