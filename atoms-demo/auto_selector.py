import os
import json
import time
import requests
from typing import List, Dict, Optional, Any

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path='.env.local')
except ImportError:
    pass

API_KEY = os.getenv("OPENROUTER_API_KEY") or "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" # Fallback if not in env, based on list_models.py

class LLMSelector:
    def __init__(self):
        self.api_key = API_KEY
        self.base_url = "https://openrouter.ai/api/v1"
        self.models: List[Dict[str, Any]] = []
        self.current_model_index = 0
        self.banned_models = set()

    def fetch_models(self) -> List[Dict[str, Any]]:
        """Fetch all available models from OpenRouter."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/likecu", # Required by OpenRouter
            "X-Title": "Auto-LLM-Selector"
        }
        try:
            response = requests.get(f"{self.base_url}/models", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('data', [])
            else:
                print(f"Error fetching models: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"Exception fetching models: {e}")
            return []

    def filter_models(self, all_models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter for models that are:
        1. Free ('pricing' -> 'prompt' == '0' or '0.0' or similar logic)
           Actually proper check is checking pricing fields strictly.
           Or check ID for ':free' suffix which OpenRouter often uses, but pricing dict is safer.
        2. Support tools ('supported_parameters' contains 'tools')
        """
        valid_models = []
        for m in all_models:
            # Check price
            pricing = m.get('pricing', {})
            prompt_price = float(pricing.get('prompt', -1))
            completion_price = float(pricing.get('completion', -1))
            
            is_free = (prompt_price == 0.0 and completion_price == 0.0)
            
            # Also accept if ID ends with :free as a strong signal
            if ':free' in m['id']:
                is_free = True

            # Check tools support
            # supported_parameters is a list of strings
            supported_params = m.get('supported_parameters', [])
            supports_tools = 'tools' in supported_params

            if is_free and supports_tools:
                valid_models.append(m)
        
        # Sort by context length desc as a tie breaker? Or just keep default order?
        # Let's verify if we have any priority. Maybe Google models first?
        # For now, just simplistic list.
        return valid_models

    def refresh_models(self):
        """Fetch and filter models, resetting the index."""
        print("Fetching and updating model list...")
        all_models = self.fetch_models()
        self.models = self.filter_models(all_models)
        self.current_model_index = 0
        print(f"Found {len(self.models)} free models with tool support.")

    def get_current_model(self) -> Optional[Dict[str, Any]]:
        """Get the current best model info."""
        if not self.models:
            self.refresh_models()
        
        # Try to find a non-banned model starting from current index
        for i in range(len(self.models)):
            idx = (self.current_model_index + i) % len(self.models)
            model = self.models[idx]
            if model['id'] not in self.banned_models:
                self.current_model_index = idx # Update current to this one
                return model
        
        return None # No models available

    def report_failure(self, model_id: str):
        """Report a failure for the current model, banning it temporarily from selection."""
        print(f"Reporting failure for model: {model_id}")
        self.banned_models.add(model_id)
        # Verify if we need to wrap around or banned everyone
        # For now simple set add is enough. get_current_model logic handles skipping it.

    def demo_loop(self):
        """Demonstrate the selection mechanism."""
        self.refresh_models()
        
        while True:
            model = self.get_current_model()
            if not model:
                print("No more models available!")
                break
            
            print(f"\nSelected Model: {model['id']}")
            print(f"  Name: {model['name']}")
            print(f"  Context: {model['context_length']}")
            
            user_input = input("Simulate (s)uccess or (f)ailure? [s/f/q]: ").strip().lower()
            if user_input == 'q':
                break
            elif user_input == 'f':
                self.report_failure(model['id'])
            else:
                print("Keeping current model.")

if __name__ == "__main__":
    import sys
    selector = LLMSelector()
    if "--demo" in sys.argv:
        selector.demo_loop()
    else:
        # Just print one
        model = selector.get_current_model()
        if model:
            print(json.dumps(model, indent=2))
        else:
            print("No models found.")
