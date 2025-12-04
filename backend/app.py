from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
import uuid

from dbx_cli import DatabricksCLI
from dq_checks import DQChecks
from ai_analyzer import AIAnalyzer
from fixit_generator import FixItGenerator
from report_generator import ReportGenerator
from model_selector import get_active_model
from utils import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Databricks PS AI Data Quality Guardrail")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State storage (in-memory for demo)
scans = {}

class ScanRequest(BaseModel):
    path: str
    type: str  # 'file' or 'table'

class FixItRequest(BaseModel):
    scan_id: str

@app.on_event("startup")
async def startup_event():
    # Create sample data
    os.makedirs("data", exist_ok=True)
    if not os.path.exists("data/sample.csv"):
        df = pd.DataFrame({
            "id": range(100),
            "value": [x if x % 10 != 0 else None for x in range(100)],
            "category": ["A", "B", "C", "A"] * 25,
            "timestamp": pd.date_range(start="2023-01-01", periods=100)
        })
        # Add some duplicates
        df = pd.concat([df, df.iloc[:5]])
        df.to_csv("data/sample.csv", index=False)
        logger.info("Created sample.csv")

@app.get("/api/status")
async def get_status():
    return {"status": "online", "model": get_active_model()}

@app.get("/api/paths")
async def list_paths(path: str = "dbfs:/"):
    return DatabricksCLI.list_path(path)

# ==========================================
# Unity Catalog Endpoints
# ==========================================

@app.get("/api/catalogs")
async def list_catalogs():
    """List all catalogs in Unity Catalog."""
    return DatabricksCLI.list_catalogs()

@app.get("/api/catalogs/{catalog_name}/schemas")
async def list_schemas(catalog_name: str):
    """List schemas in a catalog."""
    return DatabricksCLI.list_schemas(catalog_name)

@app.get("/api/catalogs/{catalog_name}/schemas/{schema_name}/tables")
async def list_tables(catalog_name: str, schema_name: str):
    """List tables in a schema."""
    return DatabricksCLI.list_tables(catalog_name, schema_name)

@app.get("/api/catalogs/{catalog_name}/schemas/{schema_name}/tables/{table_name}")
async def get_table_info(catalog_name: str, schema_name: str, table_name: str):
    """Get detailed information about a table."""
    return DatabricksCLI.get_table_info(catalog_name, schema_name, table_name)


@app.get("/api/report/{scan_id}")
async def get_report(scan_id: str):
    """Get the markdown report for a scan."""
    from fastapi.responses import PlainTextResponse
    
    if scan_id not in scans:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan_data = scans[scan_id]
    report_path = scan_data.get("report_path", "")
    
    if report_path and os.path.exists(report_path):
        with open(report_path, 'r') as f:
            return PlainTextResponse(f.read())
    
    raise HTTPException(status_code=404, detail="Report not found")


@app.post("/api/scan")
async def run_scan(request: ScanRequest):
    scan_id = str(uuid.uuid4())
    df = None
    
    try:
        # For demo purposes, if path is 'sample', use local sample data
        if request.path == "sample":
            df = pd.read_csv("data/sample.csv")
            logger.info("Using local sample.csv for scan")
        elif request.type == "table":
            # Use push-down SQL analysis - compute metrics directly on Databricks
            logger.info(f"Running push-down SQL analysis on: {request.path}")
            
            # Parse table name to get catalog, schema, table
            parts = request.path.split(".")
            if len(parts) != 3:
                logger.warning(f"Invalid table path format: {request.path}. Expected catalog.schema.table")
                df = pd.read_csv("data/sample.csv")
            else:
                catalog, schema, table = parts
                
                # Get table schema first
                table_info = DatabricksCLI.get_table_info(catalog, schema, table)
                
                if "error" in table_info or table_info.get("mock"):
                    logger.warning(f"Could not get table info: {table_info.get('error', 'using mock')}. Falling back to sample data.")
                    df = pd.read_csv("data/sample.csv")
                else:
                    columns = table_info.get("columns", [])
                    if not columns:
                        logger.warning("No columns found in table info. Falling back to sample data.")
                        df = pd.read_csv("data/sample.csv")
                    else:
                        # Generate aggregation SQL
                        analysis_sql = DQChecks.generate_sql_analysis(request.path, columns)
                        logger.info(f"Executing push-down SQL:\n{analysis_sql[:500]}...")
                        
                        # Execute the SQL
                        sql_result = DatabricksCLI.run_sql(analysis_sql)
                        
                        if "error" in sql_result:
                            logger.warning(f"Push-down SQL failed: {sql_result['error']}. Falling back to sample data.")
                            df = pd.read_csv("data/sample.csv")
                        else:
                            # Parse results using push-down parser
                            dq_results = DQChecks.parse_sql_results(sql_result, columns, request.path)
                            
                            if "error" in dq_results:
                                logger.warning(f"Failed to parse SQL results: {dq_results['error']}. Falling back to sample data.")
                                df = pd.read_csv("data/sample.csv")
                            else:
                                # Success! Skip the Pandas analysis path
                                df = None  # Signal that we used push-down
                                logger.info(f"Push-down analysis successful: {dq_results['row_count']:,} rows analyzed")
        elif request.path.startswith("dbfs:"):
            # Try to read from DBFS
            logger.info(f"Attempting to read DBFS path: {request.path}")
            head = DatabricksCLI.read_head(request.path)
            if isinstance(head, dict) and "error" in head:
                logger.warning(f"DBFS read failed: {head['error']}. Falling back to sample data.")
                df = pd.read_csv("data/sample.csv")
            else:
                import io
                df = pd.read_csv(io.StringIO(head))
                logger.info(f"Successfully loaded from DBFS: {request.path}")
        else:
            # Default fallback to sample data
            logger.info(f"Unknown path type '{request.path}', using sample data")
            df = pd.read_csv("data/sample.csv")

        # Run Checks - only if we didn't use push-down SQL
        if df is not None:
            dq_results = DQChecks.analyze_dataframe(df)
            # Add source info to results
            dq_results["source"] = request.path
            dq_results["source_type"] = request.type
        # else: dq_results was already set by push-down SQL path
        
        # Run AI Analysis
        ai_analysis = AIAnalyzer.analyze_issues(dq_results)
        
        # Generate Report
        report_path = ReportGenerator.generate_report(dq_results, ai_analysis)
        
        scans[scan_id] = {
            "dq_results": dq_results,
            "ai_analysis": ai_analysis,
            "report_path": report_path
        }
        
        return {"scan_id": scan_id, "status": "complete", "results": dq_results, "analysis": ai_analysis}
        
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-fixit")
async def generate_fixit(request: FixItRequest):
    if request.scan_id not in scans:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    scan_data = scans[request.scan_id]
    notebook_content = FixItGenerator.generate_notebook(scan_data["dq_results"], scan_data["ai_analysis"])
    
    # Save notebook locally
    filename = f"fixit_{request.scan_id}.py"
    local_path = os.path.join("../notebooks", filename)
    os.makedirs("../notebooks", exist_ok=True)
    with open(local_path, "w") as f:
        f.write(notebook_content)
    
    # Store local path for upload later
    scans[request.scan_id]["notebook_local_path"] = local_path
    scans[request.scan_id]["notebook_filename"] = filename
        
    return {"notebook_path": local_path, "content": notebook_content, "filename": filename}

class UploadNotebookRequest(BaseModel):
    scan_id: str
    workspace_path: str = None  # Optional, defaults to /Shared/DataQualityReports/

@app.post("/api/upload-notebook")
async def upload_notebook(request: UploadNotebookRequest):
    """Upload a generated Fix-It notebook to Databricks workspace."""
    if request.scan_id not in scans:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan_data = scans[request.scan_id]
    
    if "notebook_local_path" not in scan_data:
        raise HTTPException(status_code=400, detail="No notebook generated yet. Generate a Fix-It notebook first.")
    
    local_path = scan_data["notebook_local_path"]
    filename = scan_data["notebook_filename"]
    
    # Default workspace path if not provided
    if not request.workspace_path:
        workspace_path = f"/Shared/DataQualityReports/{filename}"
    else:
        workspace_path = request.workspace_path
    
    try:
        result = DatabricksCLI.upload_notebook(local_path, workspace_path)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "workspace_path": workspace_path,
            "message": f"Notebook uploaded successfully to {workspace_path}",
            "workspace_url": f"{os.getenv('DATABRICKS_HOST')}#workspace{workspace_path}"
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve Frontend
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
