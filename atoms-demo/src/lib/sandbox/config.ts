
export const SANDBOX_CONFIG = {
    // Docker Image to use for the sandbox
    IMAGE_NAME: 'atoms-sandbox:latest',

    // Local path where user workspaces are stored (Host Machine Path)
    // In development (Mac), this is a local path.
    // In production (Docker), this should be the path on the HOST machine (mounted), or a named volume.
    // For simplicity in this demo, we use a relative path resolved to absolute.
    HOST_WORKSPACES_DIR: process.env.SANDBOX_HOST_DIR || process.cwd() + '/workspaces',

    // Container resource limits
    MEMORY_LIMIT: 512 * 1024 * 1024, // 512MB
    CPU_SHARES: 512, // 0.5 CPU roughly

    // Network
    NETWORK_DISABLED: false, // Set true to disable internet access

    // Execution timeout
    EXEC_TIMEOUT_MS: 30000, // 30 seconds
};
