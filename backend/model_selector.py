from utils import get_config

def get_active_model():
    """Determines which model is currently in use based on config."""
    config = get_config()
    if config.get("token") and config.get("serving_endpoint"):
        # Clean up the model name for display
        endpoint = config['serving_endpoint']
        # Extract just the model name part (e.g., "meta-llama-3-70b-instruct")
        if endpoint.startswith("databricks-"):
            model_name = endpoint.replace("databricks-", "")
        else:
            model_name = endpoint
        return f"Llama 3 70B (Databricks)"
    elif config.get("hf_token"):
        return "Mistral-7B (Hugging Face)"
    else:
        return "Mock Mode (Demo)"
