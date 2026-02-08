
import * as path from 'path';

export const SANDBOX_CONFIG = {
    // Docker Image to use for the sandbox
    IMAGE_NAME: 'atoms-sandbox:latest',

    // Local path where user workspaces are stored (Inside the App Container)
    // This is where fs.* operations will happen.
    LOCAL_WORKSPACES_DIR: path.join(process.cwd(), 'workspaces'),

    // Host path where user workspaces are stored (Host Machine Path)
    // This is passed to Docker Binds.
    // In production (Docker-in-Docker), this MUST be the absolute path on the HOST machine.
    // In development (Local), it can be null or same as local.
    HOST_WORKSPACES_DIR: process.env.SANDBOX_HOST_DIR || process.cwd() + '/workspaces',

    // Container resource limits
    MEMORY_LIMIT: 512 * 1024 * 1024, // 512MB
    CPU_SHARES: 512, // 0.5 CPU roughly

    // Network
    NETWORK_DISABLED: false, // Set true to disable internet access

    // Execution timeout
    EXEC_TIMEOUT_MS: 30000, // 30 seconds
};
