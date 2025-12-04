#!/bin/bash
echo "Starting Databricks PS AI Data Quality Guardrail..."

# Check for Databricks CLI
if ! command -v databricks &> /dev/null; then
    echo "Warning: databricks CLI not found. Some features may not work."
    echo "Please install it: pip install databricks-cli"
fi

# Start Backend
cd backend
# Install dependencies if needed (optional check)
# pip install -r requirements.txt

echo "Starting FastAPI Backend at http://localhost:8000..."
uvicorn app:app --reload --port 8000
