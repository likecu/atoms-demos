import requests
import os
import json

API_KEY = "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" # From .env.local

def list_gemini_models():
    url = "https://openrouter.ai/api/v1/models"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            models = data.get('data', [])
            print(f"Total models: {len(models)}")
            
            gemini_models = [m['id'] for m in models if 'gemini' in m['id'].lower()]
            print("\nGemini Models:")
            for m in gemini_models:
                print(f"- {m}")
                
            free_models = [m['id'] for m in models if ':free' in m['id']]
            print("\nFree Models:")
            for m in free_models:
                print(f"- {m}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_gemini_models()
