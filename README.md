# Databricks PS AI Data Quality Guardrail

A production-ready, AI-powered Data Quality tool designed for Databricks Professional Services.

## Features
- **Data Quality Scanning**: Analyzes DBFS files and Delta Tables for schema drift, nulls, duplicates, and distribution shifts.
- **AI Analysis**: Uses Databricks Foundation Models (or generic LLMs) to provide root cause analysis and pipeline health scores.
- **Fix-It Patch Generator**: Auto-generates Databricks Notebooks (.py) with SQL and Python fixes.
- **Reporting**: Generates detailed Markdown/HTML reports.
- **Professional UI**: React-based, colorblind-safe, responsive interface.

## Prerequisites
- Python 3.9+
- Databricks CLI installed and configured (`databricks configure --token`)
- A Databricks Workspace (for real data access)

## Setup
1. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   - Copy `backend/sample_config.env` to `backend/.env`
   - Fill in your Databricks Host, Token, and Warehouse ID.

3. **Run the Application**:
   ```bash
   ./start.sh
   ```
   Or manually:
   ```bash
   cd backend
   uvicorn app:app --reload --port 8000
   ```

4. **Access the UI**:
   Open [http://localhost:8000](http://localhost:8000) in your browser.

## Usage
1. **Select Data Source**: Enter a DBFS path (e.g., `dbfs:/mnt/data/sales.csv`) or use "sample" to test with mock data.
2. **Run Scan**: Click "Run Quality Scan".
3. **View Results**: Explore the DQ Score, Issues List, and Charts.
4. **Generate Fix**: Go to the "Fix-It Generator" tab and create a remediation notebook.
5. **Download Report**: Get the full assessment report.

## Project Structure
- `backend/`: FastAPI application and logic.
- `frontend/`: React application (no build step required).
- `outputs/`: Generated reports and logs.
- `notebooks/`: Generated Fix-It notebooks.

## Troubleshooting
- **Databricks CLI Error**: Ensure `databricks` is in your PATH and configured.
- **AI Model Error**: If no token is provided, the system falls back to a mock heuristic mode.
