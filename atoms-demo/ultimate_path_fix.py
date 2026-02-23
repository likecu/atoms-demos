import subprocess
import sys

def ultimate_fix():
    project_id = '54eff819-898b-4dbd-8a1a-892c2882194e'
    # 确认的隔离后正确路径
    correct_path = f"/home/milk/atoms-demo/atoms-demo/atoms-demo/workspaces/{project_id}"
    # 旧的错误写入路径
    old_path = f"/home/milk/atoms-demo/workspaces/{project_id}"
    
    print(f"Phase 1: Force cleanup all related sandboxes...")
    # 停止并删除所有 sandbox 容器，强制它们下次由主应用重新创建（以便应用新的 SANDBOX_HOST_DIR）
    cleanup_cmd = "docker ps -a --filter name=sandbox- -q | xargs -r docker rm -f"
    subprocess.run(["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", cleanup_cmd])
    
    print(f"Phase 2: Ensure correct directory structure and migrate metadata...")
    # 确保目标目录存在，并将旧路径下可能遗留的 server.js 等文件迁移过去
    migrate_cmd = f"mkdir -p {correct_path} && cp -rn {old_path}/* {correct_path}/ 2>/dev/null || true"
    subprocess.run(["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", migrate_cmd])
    
    print(f"Phase 3: Restart Main Application to reflect ENV changes...")
    restart_cmd = "cd /home/milk/atoms-demo/atoms-demo/atoms-demo && docker-compose restart app"
    subprocess.run(["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", restart_cmd])

if __name__ == "__main__":
    ultimate_fix()
    
    # 最后运行一次验证
    from debug_and_migrate import run_remote_debug, debug_code
    print("\n--- Final Health Check Inside Container ---")
    stdout, stderr = run_remote_debug(debug_code, '54eff819-898b-4dbd-8a1a-892c2882194e')
    print(stdout)
