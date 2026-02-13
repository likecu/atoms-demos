
import requests
import sys
import time

HOST = sys.argv[1] if len(sys.argv) > 1 else "http://34.72.125.220:3000"

def register(username, password, email=None):
    url = f"{HOST}/api/auth/register"
    data = {"username": username, "password": password}
    if email:
        data["email"] = email
    print(f"Registering with {data}...")
    try:
        resp = requests.post(url, json=data, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        try:
            return resp.json()
        except:
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

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
uname = f"user_{timestamp}"
email = f"user_{timestamp}@example.com"
pw = "password123"

print("--- Scenario 1: Register with explicit email ---")
res = register(uname, pw, email)

if res and "user" in res:
    print("Trying login with username...")
    login(uname, pw)
    print("Trying login with email...")
    login(email, pw)
else:
    print("Registration failed.")

email_uname = f"email_{timestamp}@example.com"
print("\n--- Scenario 2: Register with email as username ---")
register(email_uname, pw)
login(email_uname, pw)
