import pandas as pd
import numpy as np
from utils import get_logger

logger = get_logger(__name__)

def convert_to_native_types(obj):
    """Convert numpy/pandas types to native Python types for JSON serialization."""
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_native_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native_types(item) for item in obj]
    return obj

class DQChecks:
    @staticmethod
    def analyze_dataframe(df: pd.DataFrame):
        """Runs comprehensive DQ checks on a pandas DataFrame."""
        logger.info("Starting DQ analysis...")
        
        results = {
            "row_count": int(len(df)),
            "columns": list(df.columns),
            "missing_values": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
            "duplicates": int(df.duplicated().sum()),
            "column_types": df.dtypes.astype(str).to_dict(),
            "numeric_distribution": {},
            "issues": []
        }
        
        # Null Analysis
        for col, null_count in results["missing_values"].items():
            null_ratio = null_count / len(df) if len(df) > 0 else 0
            if null_ratio > 0.05:
                results["issues"].append({
                    "type": "High Null Ratio",
                    "column": col,
                    "severity": "High" if null_ratio > 0.2 else "Medium",
                    "details": f"{null_ratio:.1%} of values are null."
                })

        # Duplicate Analysis
        if results["duplicates"] > 0:
            results["issues"].append({
                "type": "Duplicate Rows",
                "column": "All",
                "severity": "High",
                "details": f"Found {results['duplicates']} duplicate rows."
            })

        # Distribution Checks (Numeric)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            desc = df[col].describe().to_dict()
            # Convert to native types
            desc = {k: float(v) if isinstance(v, (np.floating, np.float64)) else v for k, v in desc.items()}
            results["numeric_distribution"][col] = desc
            
            # Simple anomaly detection (Z-score heuristic or similar could go here)
            # For now, check for 0 variance
            if desc.get("std", 0) == 0 and len(df) > 1:
                results["issues"].append({
                    "type": "Zero Variance",
                    "column": col,
                    "severity": "Low",
                    "details": "Column has constant value."
                })

        # Timestamp Checks
        time_cols = df.select_dtypes(include=['datetime', 'datetimetz']).columns
        for col in time_cols:
            if df[col].isnull().all():
                continue
            
            # Check for future dates (sanity check)
            if (df[col] > pd.Timestamp.now()).any():
                results["issues"].append({
                    "type": "Future Dates Detected",
                    "column": col,
                    "severity": "Medium",
                    "details": "Contains dates in the future."
                })

        score = 100 - (len(results["issues"]) * 5)
        results["dq_score"] = max(0, score)
        
        logger.info("DQ analysis complete.")
        
        # Convert all numpy types to native Python types
        return convert_to_native_types(results)

    @staticmethod
    def generate_sql_analysis(table_name: str, columns: list) -> str:
        """
        Generates a SQL query to compute data quality metrics directly on Databricks.
        This enables analysis of billion-row tables without moving data.
        
        Args:
            table_name: Fully qualified table name (catalog.schema.table)
            columns: List of column dicts with 'name' and 'type_name' keys
        
        Returns:
            SQL query string
        """
        logger.info(f"Generating push-down SQL for {table_name} with {len(columns)} columns")
        
        select_parts = ["COUNT(*) as total_rows"]
        
        for col in columns:
            col_name = col["name"]
            col_type = col.get("type_name", "STRING").upper()
            safe_name = col_name.replace(" ", "_").replace("-", "_")
            
            # Non-null count for all columns
            select_parts.append(f"COUNT(`{col_name}`) as `{safe_name}_non_null`")
            
            # Cardinality for string/categorical columns (skip for very wide types)
            if col_type in ["STRING", "INT", "LONG", "SHORT", "BYTE"]:
                select_parts.append(f"COUNT(DISTINCT `{col_name}`) as `{safe_name}_distinct`")
            
            # Min/Max/Avg for numeric columns
            if col_type in ["INT", "LONG", "SHORT", "BYTE", "FLOAT", "DOUBLE", "DECIMAL"]:
                select_parts.append(f"MIN(`{col_name}`) as `{safe_name}_min`")
                select_parts.append(f"MAX(`{col_name}`) as `{safe_name}_max`")
                select_parts.append(f"AVG(`{col_name}`) as `{safe_name}_avg`")
            
            # Future date check for timestamps
            if col_type in ["TIMESTAMP", "DATE"]:
                select_parts.append(f"MAX(CASE WHEN `{col_name}` > current_timestamp() THEN 1 ELSE 0 END) as `{safe_name}_has_future`")
        
        query = f"SELECT\n  " + ",\n  ".join(select_parts) + f"\nFROM {table_name}"
        return query

    @staticmethod
    def parse_sql_results(sql_result: dict, columns: list, table_name: str) -> dict:
        """
        Parses the SQL aggregation results into the standard DQ results format.
        
        Args:
            sql_result: Result from DatabricksCLI.run_sql() with 'data_array' and 'manifest'
            columns: Original column metadata list
            table_name: Source table name
        
        Returns:
            dict: Same structure as analyze_dataframe() returns
        """
        logger.info("Parsing push-down SQL results")
        
        # Extract the single row of aggregation results
        data_array = sql_result.get("data_array", [])
        manifest_cols = sql_result.get("manifest", {}).get("schema", {}).get("columns", [])
        
        if not data_array or not manifest_cols:
            logger.warning("Empty SQL results")
            return {"error": "Empty SQL results", "row_count": 0, "columns": [], "issues": [], "dq_score": 0}
        
        # Build a dict of metric_name -> value
        row = data_array[0]
        metrics = {}
        for i, col in enumerate(manifest_cols):
            metrics[col["name"]] = row[i] if i < len(row) else None
        
        # Parse total rows
        total_rows = int(metrics.get("total_rows", 0) or 0)
        
        # Build results structure
        results = {
            "row_count": total_rows,
            "columns": [c["name"] for c in columns],
            "column_types": {c["name"]: c.get("type_name", "UNKNOWN") for c in columns},
            "missing_values": {},
            "duplicates": 0,  # Can't easily detect exact duplicates via aggregation
            "numeric_distribution": {},
            "issues": [],
            "source": table_name,
            "source_type": "table",
            "analysis_method": "push_down_sql"  # Flag to indicate this was server-side analysis
        }
        
        # Process each column's metrics
        for col in columns:
            col_name = col["name"]
            col_type = col.get("type_name", "STRING").upper()
            safe_name = col_name.replace(" ", "_").replace("-", "_")
            
            # Calculate nulls from non_null count
            non_null = int(metrics.get(f"{safe_name}_non_null", 0) or 0)
            null_count = total_rows - non_null
            results["missing_values"][col_name] = null_count
            
            # Check for high null ratio
            if total_rows > 0:
                null_ratio = null_count / total_rows
                if null_ratio > 0.05:
                    results["issues"].append({
                        "type": "High Null Ratio",
                        "column": col_name,
                        "severity": "High" if null_ratio > 0.2 else "Medium",
                        "details": f"{null_ratio:.1%} of values are null ({null_count:,} of {total_rows:,} rows)."
                    })
            
            # Numeric distribution
            if col_type in ["INT", "LONG", "SHORT", "BYTE", "FLOAT", "DOUBLE", "DECIMAL"]:
                min_val = metrics.get(f"{safe_name}_min")
                max_val = metrics.get(f"{safe_name}_max")
                avg_val = metrics.get(f"{safe_name}_avg")
                
                if min_val is not None and max_val is not None:
                    results["numeric_distribution"][col_name] = {
                        "min": float(min_val) if min_val else None,
                        "max": float(max_val) if max_val else None,
                        "mean": float(avg_val) if avg_val else None,
                        "count": non_null
                    }
                    
                    # Check for zero variance (constant value)
                    # Only flag if: value is non-zero (0-0 is common for sparse data) AND enough data exists
                    try:
                        min_float = float(min_val) if min_val else 0
                        max_float = float(max_val) if max_val else 0
                        if min_float == max_float and min_float != 0 and non_null > 10:
                            results["issues"].append({
                                "type": "Zero Variance",
                                "column": col_name,
                                "severity": "Low",
                                "details": f"Column has constant value: {min_val}"
                            })
                    except (ValueError, TypeError):
                        pass  # Skip if values can't be compared
            
            # Future date check
            if col_type in ["TIMESTAMP", "DATE"]:
                has_future = metrics.get(f"{safe_name}_has_future")
                if has_future and int(has_future) > 0:
                    results["issues"].append({
                        "type": "Future Dates Detected",
                        "column": col_name,
                        "severity": "Medium",
                        "details": "Contains dates in the future."
                    })
            
            # Cardinality check (potential unique ID detection)
            distinct = metrics.get(f"{safe_name}_distinct")
            if distinct is not None and total_rows > 0:
                cardinality_ratio = int(distinct) / total_rows
                if cardinality_ratio > 0.99 and total_rows > 100:
                    # This column is likely a unique identifier
                    results.setdefault("potential_keys", []).append(col_name)
        
        # Calculate DQ score
        score = 100 - (len(results["issues"]) * 5)
        results["dq_score"] = max(0, score)
        
        logger.info(f"Push-down analysis complete: {total_rows:,} rows, {len(results['issues'])} issues, score={results['dq_score']}")
        
        return results
