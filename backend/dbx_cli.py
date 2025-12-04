import subprocess
import json
import shutil
import os
from utils import get_logger, get_config

logger = get_logger(__name__)
config = get_config()

class DatabricksCLI:
    @staticmethod
    def run_command(args):
        """Runs a databricks CLI command and returns output."""
        try:
            # Ensure databricks CLI is available
            if not shutil.which("databricks"):
                return {"error": "Databricks CLI not found. Please install it."}

            # Construct command
            cmd = ["databricks"] + args
            
            # Run command
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True,
                env={**os.environ, "DATABRICKS_HOST": config["host"] or "", "DATABRICKS_TOKEN": config["token"] or ""}
            )
            
            if result.returncode != 0:
                logger.error(f"Command failed: {cmd}, Error: {result.stderr}")
                return {"error": result.stderr}
            
            return {"output": result.stdout}
        except Exception as e:
            logger.error(f"Exception running command: {e}")
            return {"error": str(e)}

    @staticmethod
    def list_path(path):
        """Lists files in a DBFS path."""
        logger.info(f"Listing path: {path}")
        res = DatabricksCLI.run_command(["fs", "ls", path])
        if "error" in res:
            return res
        
        # Parse output (simple parsing assuming 'path size' format or similar)
        # 'databricks fs ls' output format: 'dbfs:/path/file 123'
        files = []
        for line in res["output"].strip().split("\n"):
            if line:
                parts = line.split()
                if len(parts) >= 1:
                    files.append({"path": parts[0], "is_dir": parts[0].endswith("/")})
        return files

    @staticmethod
    def read_head(path, lines=10):
        """Reads the first N lines of a file."""
        logger.info(f"Reading head of: {path}")
        # Copy to local tmp first as 'fs head' might not be standard or reliable for all file types
        # But 'databricks fs cat' exists. Let's use cat and limit output.
        res = DatabricksCLI.run_command(["fs", "cat", path])
        if "error" in res:
            return res
        
        content = res["output"]
        return "\n".join(content.split("\n")[:lines])

    @staticmethod
    def run_sql(query):
        """Runs a SQL query using the Warehouse."""
        warehouse_id = config["warehouse_id"]
        if not warehouse_id:
            return {"error": "Warehouse ID not configured"}
        
        logger.info(f"Running SQL: {query}")
        # Using the SQL execution API via CLI if available, or just generic command
        # 'databricks sql query' is a valid command in newer CLI
        res = DatabricksCLI.run_command([
            "sql", "query", 
            "--warehouse-id", warehouse_id, 
            "--query", query,
            "--format", "JSON"
        ])
        
        if "error" in res:
            return res
            
        try:
            return json.loads(res["output"])
        except json.JSONDecodeError:
            return {"output": res["output"], "warning": "Could not parse JSON output"}

    @staticmethod
    def check_connection():
        """Checks connection by listing workspace root."""
        return DatabricksCLI.run_command(["workspace", "ls", "/"])

    @staticmethod
    def upload_notebook(local_path, workspace_path):
        """Uploads a notebook to Databricks workspace.
        
        Args:
            local_path: Local file path to the notebook (.py file)
            workspace_path: Destination path in workspace (e.g., /Shared/DataQualityReports/fixit.py)
        
        Returns:
            dict with 'success' or 'error'
        """
        import os as os_module
        # Convert to absolute path if relative
        abs_local_path = os_module.path.abspath(local_path)
        logger.info(f"Uploading notebook from {abs_local_path} to {workspace_path}")
        
        # Create parent directory if it doesn't exist
        parent_dir = os_module.path.dirname(workspace_path)
        if parent_dir:
            DatabricksCLI.run_command(["workspace", "mkdirs", parent_dir])
        
        # Use 'workspace import' command
        # -l PYTHON for language, -f SOURCE for format, -o for overwrite
        res = DatabricksCLI.run_command([
            "workspace", "import",
            "-l", "PYTHON",
            "-f", "SOURCE",
            "-o",
            abs_local_path,
            workspace_path
        ])
        
        if "error" in res:
            return res
        
        return {"success": True, "workspace_path": workspace_path, "message": "Notebook uploaded successfully"}

    # ==========================================
    # Unity Catalog Methods
    # ==========================================
    
    @staticmethod
    def list_catalogs():
        """Lists all catalogs in Unity Catalog."""
        logger.info("Listing Unity Catalog catalogs...")
        # Legacy CLI (v0.18) outputs JSON by default
        res = DatabricksCLI.run_command(["unity-catalog", "catalogs", "list"])
        
        if "error" in res:
            # Fall back to mock data for demo
            logger.warning("Unity Catalog not available, using mock data")
            return {
                "catalogs": [
                    {"name": "main", "comment": "Main catalog for production data", "owner": "admin"},
                    {"name": "samples", "comment": "Sample datasets for testing", "owner": "admin"},
                    {"name": "hive_metastore", "comment": "Legacy Hive metastore", "owner": "admin"}
                ],
                "mock": True
            }
        
        try:
            data = json.loads(res["output"])
            return {"catalogs": data.get("catalogs", []), "mock": False}
        except json.JSONDecodeError:
            return {"catalogs": [], "error": "Could not parse catalog list"}

    @staticmethod
    def list_schemas(catalog_name):
        """Lists schemas in a catalog."""
        logger.info(f"Listing schemas in catalog: {catalog_name}")
        res = DatabricksCLI.run_command([
            "unity-catalog", "schemas", "list",
            "--catalog-name", catalog_name
        ])
        
        if "error" in res:
            # Fall back to mock data
            logger.warning(f"Could not list schemas for {catalog_name}, using mock data")
            mock_schemas = {
                "main": [
                    {"name": "default", "comment": "Default schema", "catalog_name": "main"},
                    {"name": "sales", "comment": "Sales data", "catalog_name": "main"},
                    {"name": "customers", "comment": "Customer information", "catalog_name": "main"},
                    {"name": "products", "comment": "Product catalog", "catalog_name": "main"}
                ],
                "samples": [
                    {"name": "nyctaxi", "comment": "NYC Taxi dataset", "catalog_name": "samples"},
                    {"name": "tpch", "comment": "TPC-H benchmark data", "catalog_name": "samples"}
                ],
                "hive_metastore": [
                    {"name": "default", "comment": "Default Hive schema", "catalog_name": "hive_metastore"}
                ]
            }
            return {"schemas": mock_schemas.get(catalog_name, []), "mock": True}
        
        try:
            data = json.loads(res["output"])
            return {"schemas": data.get("schemas", []), "mock": False}
        except json.JSONDecodeError:
            return {"schemas": [], "error": "Could not parse schema list"}

    @staticmethod
    def list_tables(catalog_name, schema_name):
        """Lists tables in a schema."""
        logger.info(f"Listing tables in {catalog_name}.{schema_name}")
        res = DatabricksCLI.run_command([
            "unity-catalog", "tables", "list",
            "--catalog-name", catalog_name,
            "--schema-name", schema_name
        ])
        
        if "error" in res:
            # Fall back to mock data
            logger.warning(f"Could not list tables for {catalog_name}.{schema_name}, using mock data")
            mock_tables = {
                "main.sales": [
                    {"name": "transactions", "table_type": "MANAGED", "data_source_format": "DELTA"},
                    {"name": "orders", "table_type": "MANAGED", "data_source_format": "DELTA"},
                    {"name": "revenue_daily", "table_type": "VIEW", "data_source_format": None}
                ],
                "main.customers": [
                    {"name": "customer_info", "table_type": "MANAGED", "data_source_format": "DELTA"},
                    {"name": "customer_segments", "table_type": "MANAGED", "data_source_format": "DELTA"}
                ],
                "main.products": [
                    {"name": "product_catalog", "table_type": "MANAGED", "data_source_format": "DELTA"},
                    {"name": "inventory", "table_type": "MANAGED", "data_source_format": "DELTA"}
                ],
                "main.default": [
                    {"name": "sample_data", "table_type": "MANAGED", "data_source_format": "DELTA"}
                ],
                "samples.nyctaxi": [
                    {"name": "trips", "table_type": "EXTERNAL", "data_source_format": "DELTA"},
                    {"name": "zones", "table_type": "EXTERNAL", "data_source_format": "DELTA"}
                ],
                "samples.tpch": [
                    {"name": "orders", "table_type": "EXTERNAL", "data_source_format": "DELTA"},
                    {"name": "lineitem", "table_type": "EXTERNAL", "data_source_format": "DELTA"},
                    {"name": "customer", "table_type": "EXTERNAL", "data_source_format": "DELTA"}
                ]
            }
            key = f"{catalog_name}.{schema_name}"
            return {"tables": mock_tables.get(key, []), "mock": True}
        
        try:
            data = json.loads(res["output"])
            return {"tables": data.get("tables", []), "mock": False}
        except json.JSONDecodeError:
            return {"tables": [], "error": "Could not parse table list"}

    @staticmethod
    def get_table_info(catalog_name, schema_name, table_name):
        """Gets detailed information about a table including columns."""
        full_name = f"{catalog_name}.{schema_name}.{table_name}"
        logger.info(f"Getting table info for: {full_name}")
        
        # Legacy CLI requires --full-name flag
        res = DatabricksCLI.run_command([
            "unity-catalog", "tables", "get",
            "--full-name", full_name
        ])
        
        if "error" in res:
            # Fall back to mock data
            logger.warning(f"Could not get table info for {full_name}, using mock data")
            mock_columns = [
                {"name": "id", "type_name": "LONG", "nullable": False, "comment": "Primary key"},
                {"name": "created_at", "type_name": "TIMESTAMP", "nullable": False, "comment": "Creation timestamp"},
                {"name": "updated_at", "type_name": "TIMESTAMP", "nullable": True, "comment": "Last update time"},
                {"name": "name", "type_name": "STRING", "nullable": True, "comment": "Record name"},
                {"name": "value", "type_name": "DOUBLE", "nullable": True, "comment": "Numeric value"},
                {"name": "category", "type_name": "STRING", "nullable": True, "comment": "Category label"},
                {"name": "is_active", "type_name": "BOOLEAN", "nullable": False, "comment": "Active flag"}
            ]
            return {
                "name": table_name,
                "catalog_name": catalog_name,
                "schema_name": schema_name,
                "full_name": full_name,
                "table_type": "MANAGED",
                "data_source_format": "DELTA",
                "columns": mock_columns,
                "comment": f"Sample table in {schema_name}",
                "owner": "admin",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-11-20T14:45:00Z",
                "mock": True
            }
        
        try:
            data = json.loads(res["output"])
            data["mock"] = False
            return data
        except json.JSONDecodeError:
            return {"error": "Could not parse table info"}
