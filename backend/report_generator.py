import os
from datetime import datetime
from utils import get_logger

logger = get_logger(__name__)

class ReportGenerator:
    @staticmethod
    def generate_report(dq_results, ai_analysis, output_dir="../outputs/reports"):
        """Generates a Markdown report and saves it."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"dq_report_{timestamp}.md"
        filepath = os.path.join(output_dir, filename)
        
        os.makedirs(output_dir, exist_ok=True)
        
        content = f"""# Data Quality Assessment Report
**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**DQ Score:** {dq_results.get('dq_score')}

## Executive Summary
{ai_analysis.get('summary')}

## Pipeline Health
**Status:** {ai_analysis.get('pipeline_health')}

## Identified Issues
"""
        for issue in dq_results.get("issues", []):
            content += f"- **{issue['type']}** ({issue['severity']}): {issue['details']} (Column: {issue['column']})\n"
            
        content += f"""
## Root Cause Analysis
{ai_analysis.get('root_cause_analysis')}

## Recommendations
### SQL Fixes
```sql
{ai_analysis.get('recommended_sql_fixes')}
```

### Python Fixes
```python
{ai_analysis.get('recommended_python_fixes')}
```
"""
        with open(filepath, "w") as f:
            f.write(content)
            
        logger.info(f"Report generated at {filepath}")
        return filepath
