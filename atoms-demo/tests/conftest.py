import pytest
import requests
import os
import uuid
import time

# Default to localhost if not specified
BASE_URL = os.getenv("TEST_BASE_URL", "http://34.72.125.220:3000")

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

@pytest.fixture(scope="session")
def test_user_creds():
    """Generates unique credentials for the test session."""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "username": f"test_{unique_id}",
        "password": "Password123!",
        "email": f"test_{unique_id}@atoms.demo"
    }

@pytest.fixture(scope="session")
def auth_session(base_url, test_user_creds):
    """
    Creates a session, registers a new user, and logs in.
    """
    session = requests.Session()
    
    username = test_user_creds["username"]
    password = test_user_creds["password"]
    email = test_user_creds["email"]
    
    # Register first
    register_url = f"{base_url}/api/auth/register"
    reg_payload = {
        "username": username,
        "password": password,
        "email": email
    }
    print(f"Attempting to register user: {username}")
    reg_response = session.post(register_url, json=reg_payload)
    
    if reg_response.status_code not in [200, 201]:
         print(f"Registration failed: {reg_response.status_code} - {reg_response.text}")
         # Attempt login anyway in case it was a race condition or user exists (unlikely with uuid)
    
    # Login
    login_url = f"{base_url}/api/auth/login"
    login_payload = {
        "username": username,
        "password": password,
        "email": email
    }
    print(f"Attempting to login user: {username}")
    response = session.post(login_url, json=login_payload)
            
    if response.status_code == 200:
        data = response.json()
        token = data.get("session", {}).get("access_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
            print("Login successful, token acquired.")
        else:
             print("Login successful but no token found.")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        
    return session
