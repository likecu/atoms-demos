import subprocess
import sys

def recover_files():
    project_id = '54eff819-898b-4dbd-8a1a-892c2882194e'
    # 之前追踪确认的正确物理路径
    correct_path = f"/home/milk/atoms-demo/atoms-demo/atoms-demo/workspaces/{project_id}"
    
    print(f"Targeting Correct Path: {correct_path}")
    
    # 搜索宿主机上所有该项目的目录（排除掉正确路径本身，避免自循环）
    find_cmd = f"find /home/milk/atoms-demo -name {project_id} -type d"
    ssh_find = ["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", find_cmd]
    res = subprocess.run(ssh_find, capture_output=True, text=True)
    paths = [p for p in res.stdout.strip().split('\n') if p and p != correct_path]
    
    print(f"Found other potential sources: {paths}")
    
    for src in paths:
        print(f"Merging from {src}...")
        # cp -rn : 不覆盖已存在文件，这样 README.md 这种初始化的文件不会被覆盖，但缺失的文件会补全
        merge_cmd = f"cp -rn {src}/* {correct_path}/ 2>/dev/null || true"
        subprocess.run(["ssh", "-i", "~/.ssh/milk", "milk@34.72.125.220", merge_cmd])

if __name__ == "__main__":
    recover_files()
    
    # 最后运行一次 node 调试验证内部可见性
    from debug_and_migrate import run_remote_debug, debug_code
    print("\n--- Final Verification Inside Container ---")
    stdout, stderr = run_remote_debug(debug_code, '54eff819-898b-4dbd-8a1a-892c2882194e')
    print(stdout)
