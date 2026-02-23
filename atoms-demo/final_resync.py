import subprocess
import sys

def final_resync():
    project_id = '54eff819-898b-4dbd-8a1a-892c2882194e'
    # 旧的“写错”但文件齐全的物理路径
    src_path = f"/home/milk/atoms-demo/workspaces/{project_id}"
    # 当前应用和新容器“看向”的正确物理路径
    dest_path = f"/home/milk/atoms-demo/atoms-demo/atoms-demo/workspaces/{project_id}"
    
    print(f"Recursively syncing files from {src_path} to {dest_path}...")
    
    # 使用 cp -a 保持权限和目录结构，不覆盖已存在的 README.md (-n)
    # 确保目标 parent 存在
    subprocess.run(["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", f"mkdir -p {dest_path}"])
    
    # 递归迁移：将 src_path 下的所有内容拷贝到 dest_path
    cmd = f"cp -an {src_path}/. {dest_path}/"
    res = subprocess.run(["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", cmd], capture_output=True, text=True)
    
    if res.returncode == 0:
        print("Sync Successful.")
    else:
        print(f"Sync issue: {res.stderr}")

if __name__ == "__main__":
    final_resync()
    
    # 验证应用容器内部是否可见
    from debug_and_migrate import run_remote_debug, debug_code
    print("\n--- Verification Inside App Container ---")
    stdout, stderr = run_remote_debug(debug_code, '54eff819-898b-4dbd-8a1a-892c2882194e')
    print(stdout)
