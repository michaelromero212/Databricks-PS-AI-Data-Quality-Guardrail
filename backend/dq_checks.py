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
