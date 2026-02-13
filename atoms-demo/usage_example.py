from auto_selector import LLMSelector
import time

def mock_llm_call(model_id, prompt):
    """
    Simulate an LLM call. 
    In real usage, this would be your actual API call to https://openrouter.ai/api/v1/chat/completions
    """
    print(f"Calling model {model_id} with prompt: '{prompt}'...")
    
    # Simulate random failure for demonstration
    if "openrouter/aurora-alpha" in model_id: # Let's say this one assumes to be flaky for demo
        # But wait, I don't know which one comes first.
        # Let's just say we fail the first 2 times.
        pass
    
    # For this example, let's just simulate success for any model
    return f"Response from {model_id}"

def main():
    selector = LLMSelector()
    prompt = "Hello, world!"
    max_retries = 5
    
    for attempt in range(max_retries):
        model = selector.get_current_model()
        if not model:
            print("No models available.")
            break
            
        model_id = model['id']
        try:
            # Try to use the model
            # In your actual code, you would verify if the response is valid (e.g. valid JSON, not empty)
            # If it's a network error or 500, raise exception
            
            # success triggers break
            response = mock_llm_call(model_id, prompt)
            print(f"Success! {response}")
            break
            
        except Exception as e:
            print(f"Model {model_id} failed: {e}")
            selector.report_failure(model_id)
            print("Switching to next model...")
            time.sleep(1) # Be nice
    else:
        print("All attempts failed.")

if __name__ == "__main__":
    main()
