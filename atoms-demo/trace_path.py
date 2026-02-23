import subprocess
import sys

def get_node_stat():
    """获取容器内文件的 Inode 编号"""
    project_id = '54eff819-898b-4dbd-8a1a-892c2882194e'
    # 获取 /app/workspaces/ID/README.md 的 inode
    node_cmd = f"node -e \\\"console.log(require('fs').statSync('/app/workspaces/{project_id}/README.md').ino)\\\""
    full_cmd = f"docker exec atoms-demo-app-1 /bin/sh -c \"{node_cmd}\""
    
    ssh_cmd = ["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", full_cmd]
    res = subprocess.run(ssh_cmd, capture_output=True, text=True)
    return res.stdout.strip()

def find_host_file_by_inode(inode):
    """在宿主机上通过 Inode 查找文件"""
    # 查找所有 README.md 并对比 inode
    find_cmd = f"find /home/milk/atoms-demo -name README.md -exec stat -c '%i %n' {{}} + | grep '^{inode} '"
    ssh_cmd = ["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", find_cmd]
    res = subprocess.run(ssh_cmd, capture_output=True, text=True)
    return res.stdout.strip()

if __name__ == "__main__":
    print("Fetching Inode from container...")
    ino = get_node_stat()
    print(f"Container README.md Inode: {ino}")
    
    if ino:
        print("Finding matching file on host...")
        match = find_host_file_by_inode(ino)
        print(f"Match found on host: {match}")
    else:
        print("Could not get inode from container.")
