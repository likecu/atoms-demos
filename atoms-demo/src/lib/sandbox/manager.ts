import Docker from 'dockerode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SANDBOX_CONFIG } from './config';

// Initialize Docker client
// On Mac/Linux, this usually works with default socket
// Specify API version to match host Docker (20.10.24, API 1.41)
const docker = new Docker({ version: 'v1.41' });

export class SandboxManager {
    private static instance: SandboxManager;
    private lastActivity: Map<string, number> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    // 2 hours in ms
    private readonly IDLE_TIMEOUT = 2 * 60 * 60 * 1000;
    // Check every 5 minutes
    private readonly CHECK_INTERVAL = 5 * 60 * 1000;

    private constructor() {
        this.startCleanupInterval();
    }

    public static getInstance(): SandboxManager {
        if (!SandboxManager.instance) {
            SandboxManager.instance = new SandboxManager();
        }
        return SandboxManager.instance;
    }

    private startCleanupInterval() {
        if (this.cleanupInterval) return;

        this.cleanupInterval = setInterval(async () => {
            const now = Date.now();
            for (const [userId, lastActive] of this.lastActivity.entries()) {
                if (now - lastActive > this.IDLE_TIMEOUT) {
                    console.log(`[Sandbox] User ${userId} sandbox idle for > 2h, stopping...`);
                    try {
                        await this.stopSandbox(userId);
                        this.lastActivity.delete(userId);
                    } catch (e) {
                        console.error(`[Sandbox] Failed to stop idle sandbox for ${userId}:`, e);
                    }
                }
            }
        }, this.CHECK_INTERVAL);

        // Unref to not hold the process if it wants to exit (though for a server it doesn't matter much)
        this.cleanupInterval.unref();
    }

    private updateActivity(userId: string) {
        this.lastActivity.set(userId, Date.now());
    }

    /**
     * Ensure the workspace directory exists for the user
     */
    async initWorkspace(userId: string): Promise<string> {
        const workspacePath = path.join(SANDBOX_CONFIG.LOCAL_WORKSPACES_DIR, userId);
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
     * Stop and remove a user's sandbox container
     */
    async stopSandbox(userId: string): Promise<void> {
        const containerName = `sandbox-${userId}`;
        const containers = await docker.listContainers({
            all: true,
            filters: { name: [containerName] },
        });

        if (containers.length > 0) {
            const container = docker.getContainer(containers[0].Id);
            const info = await container.inspect();

            if (info.State.Running) {
                await container.stop();
            }
            // We can remove it to save resources, or just stop it. 
            // Removing ensures a clean slate next time and frees up name.
            await container.remove();
            console.log(`[Sandbox] Stopped and removed sandbox for ${userId}`);
        }
    }

    // Limit max concurrent sandboxes
    private readonly MAX_SANDBOXES = 5;

    /**
     * Get or create a sandbox container for the user
     */
    async getOrCreateSandbox(userId: string): Promise<Docker.Container> {
        this.updateActivity(userId);
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

        // Check strict limit before creating new one
        await this.enforceSandboxLimit();

        // Calculate HOST path for binding
        const hostWorkspacePath = path.join(SANDBOX_CONFIG.HOST_WORKSPACES_DIR, userId);

        // Create new container
        // Note: We mount the host path to /workspace in the container
        const container = await docker.createContainer({
            Image: SANDBOX_CONFIG.IMAGE_NAME,
            name: containerName,
            Tty: true, // Keep it running
            Cmd: ['/bin/sh'], // Default command to keep it alive
            WorkingDir: '/workspace',
            HostConfig: {
                Binds: [`${hostWorkspacePath}:/workspace`],
                Memory: SANDBOX_CONFIG.MEMORY_LIMIT,
                CpuShares: SANDBOX_CONFIG.CPU_SHARES,
                // AutoRemove: true, // Don't auto-remove so we can reuse it
            },
        });

        await container.start();
        return container;
    }

    /**
     * Enforce the sandbox limit by stopping the least recently used container
     */
    private async enforceSandboxLimit(): Promise<void> {
        const containers = await docker.listContainers({
            all: true,
            filters: { name: ['sandbox-'] },
        });

        // Filter only running containers or all? Ideally running. 
        // But listContainers with all: true returns all.
        // We only care about active ones consuming resources or slots.
        // Let's count all 'sandbox-*' containers as occupying a slot.
        const activeSandboxes = containers.filter(c => c.Names.some(n => n.includes('sandbox-')));

        if (activeSandboxes.length < this.MAX_SANDBOXES) {
            return;
        }

        console.log(`[Sandbox] Limit reached (${activeSandboxes.length}/${this.MAX_SANDBOXES}). Evicting LRU...`);

        // Sort by last activity
        // If no activity recorded (e.g. after restart), treat as oldest (0)
        const sorted = activeSandboxes.sort((a, b) => {
            const userIdA = this.getUserIdFromContainerName(a.Names[0]);
            const userIdB = this.getUserIdFromContainerName(b.Names[0]);
            const timeA = this.lastActivity.get(userIdA) || 0;
            const timeB = this.lastActivity.get(userIdB) || 0;
            return timeA - timeB; // Ascending: oldest first
        });

        // Kill the oldest
        // Note: We might be killing the one we're about to create if we're not careful, 
        // but getOrCreateSandbox checks if *this* user's container exists first.
        // So we are safe to kill the oldest from the list.
        if (sorted.length > 0) {
            const victim = sorted[0];
            const victimUserId = this.getUserIdFromContainerName(victim.Names[0]);
            if (victimUserId) {
                console.log(`[Sandbox] Evicting sandbox for user ${victimUserId}`);
                await this.stopSandbox(victimUserId);
            }
        }
    }

    private getUserIdFromContainerName(containerName: string): string {
        // Name format: /sandbox-{userId}
        // dockerode returns names with leading slash
        const name = containerName.replace(/^\//, '');
        return name.replace('sandbox-', '');
    }

    /**
     * Execute a command in the user's sandbox
     */
    async execCommand(userId: string, command: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        this.updateActivity(userId);
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
            const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB limit

            (container as any).modem.demuxStream(stream, {
                write: (chunk: Buffer) => {
                    if (stdout.length < MAX_OUTPUT_SIZE) {
                        const chunkStr = chunk.toString('utf-8');
                        if (stdout.length + chunkStr.length > MAX_OUTPUT_SIZE) {
                            stdout += chunkStr.slice(0, MAX_OUTPUT_SIZE - stdout.length) + '\n[... Output truncated due to size limit ...]';
                        } else {
                            stdout += chunkStr;
                        }
                    }
                }
            }, {
                write: (chunk: Buffer) => {
                    if (stderr.length < MAX_OUTPUT_SIZE) {
                        const chunkStr = chunk.toString('utf-8');
                        if (stderr.length + chunkStr.length > MAX_OUTPUT_SIZE) {
                            stderr += chunkStr.slice(0, MAX_OUTPUT_SIZE - stderr.length) + '\n[... Output truncated due to size limit ...]';
                        } else {
                            stderr += chunkStr;
                        }
                    }
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
        this.updateActivity(userId);
        const workspacePath = path.join(SANDBOX_CONFIG.LOCAL_WORKSPACES_DIR, userId, subPath);
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
        this.updateActivity(userId);
        const workspacePath = path.join(SANDBOX_CONFIG.LOCAL_WORKSPACES_DIR, userId, subPath);
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

    /**
     * Read file content from the user's workspace
     */
    async readFile(userId: string, filePath: string): Promise<string> {
        this.updateActivity(userId);
        const fullPath = path.join(SANDBOX_CONFIG.LOCAL_WORKSPACES_DIR, userId, filePath);
        try {
            // Security check: ensure the path is within the user's workspace
            if (!fullPath.startsWith(path.join(SANDBOX_CONFIG.LOCAL_WORKSPACES_DIR, userId))) {
                throw new Error('Access denied: File path outside workspace');
            }
            return await fs.readFile(fullPath, 'utf-8');
        } catch (e) {
            console.error(`Failed to read file ${filePath} for ${userId}:`, e);
            throw e;
        }
    }
}
