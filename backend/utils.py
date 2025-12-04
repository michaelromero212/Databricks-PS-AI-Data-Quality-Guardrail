import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.dirname(__file__)), "outputs/logs/app.log")),
        logging.StreamHandler()
    ]
)

def get_logger(name):
    return logging.getLogger(name)

def get_config():
    return {
        "host": os.getenv("DATABRICKS_HOST"),
        "token": os.getenv("DATABRICKS_TOKEN"),
        "warehouse_id": os.getenv("DATABRICKS_WAREHOUSE_ID"),
        "serving_endpoint": os.getenv("DATABRICKS_SERVING_ENDPOINT", "databricks-meta-llama-3-70b-instruct"),
        "hf_token": os.getenv("HUGGINGFACE_API_TOKEN")
    }
