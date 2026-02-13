
import requests
import sys
import time

HOST = sys.argv[1] if len(sys.argv) > 1 else "http://34.72.125.220:3000"

def login(username, password):
    url = f"{HOST}/api/auth/login"
    data = {"username": username, "password": password}
    print(f"Logging in with {data}...")
    try:
        resp = requests.post(url, json=data, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

timestamp = int(time.time())
email_uname = f"email_{timestamp}@example.com"
pw = "password123"

# Register first
reg_url = f"{HOST}/api/auth/register"
reg_data = {"username": email_uname, "password": pw}
print(f"Registering {email_uname}...")
requests.post(reg_url, json=reg_data)

print("\n--- Scenario 2 Check: Login with email as username ---")
login(email_uname, pw)
