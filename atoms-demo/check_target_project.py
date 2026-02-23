import os
from supabase import create_client, Client
import json

# 从 .env.production 读取配置
# 直接在这里定义，方便运行
url = "http://34.72.125.220:36666"
service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

project_id = "e6b40a94-2133-4bb2-bebd-ae6758b6573c"

def check_db():
    supabase: Client = create_client(url, service_role_key)
    
    print(f"--- Checking Project: {project_id} ---")
    project = supabase.table("projects").select("*").eq("id", project_id).execute()
    if project.data:
        print("Project found:")
        print(json.dumps(project.data, indent=2, ensure_ascii=False))
    else:
        print("Project NOT found in database.")
        return

    print(f"\n--- Checking Messages for Project: {project_id} ---")
    messages = supabase.table("messages").select("*").eq("project_id", project_id).order("created_at").execute()
    if messages.data:
        print(f"Found {len(messages.data)} messages:")
        for msg in messages.data:
            print(f"[{msg['created_at']}] {msg['role']}: {msg['content'][:50]}...")
    else:
        print("No messages found for this project.")

    print(f"\n--- Checking AI Call Logs for Project: {project_id} ---")
    logs = supabase.table("ai_call_logs").select("*").eq("project_id", project_id).order("created_at").execute()
    if logs.data:
        print(f"Found {len(logs.data)} AI call logs.")
    else:
        print("No AI call logs found for this project.")

if __name__ == "__main__":
    check_db()
