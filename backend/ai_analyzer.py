import requests
import json
from utils import get_logger, get_config

logger = get_logger(__name__)
config = get_config()

class AIAnalyzer:
    @staticmethod
    def analyze_issues(dq_results):
        """Sends DQ results to an LLM for analysis."""
        logger.info("Starting AI analysis...")
        
        prompt = f"""
        You are a Data Quality Expert for Databricks. Analyze the following data quality issues and provide:
        1. Root cause analysis.
        2. A pipeline reliability score (0-100).
        3. Recommended SQL fixes.
        4. Recommended Python fixes.
        5. Delta Lake optimization suggestions.
        
        Data Quality Report:
        {json.dumps(dq_results, indent=2)}
        
        Return the response as valid JSON with keys: 
        root_cause_analysis, pipeline_health, recommended_sql_fixes, recommended_python_fixes, delta_optimizations, summary.
        """
        
        # Try Databricks Serving
        if config["token"] and config["serving_endpoint"]:
            try:
                return AIAnalyzer._call_databricks_llm(prompt)
            except Exception as e:
                logger.warning(f"Databricks LLM failed: {e}. Falling back to mock.")
        
        # Fallback to Mock/Heuristic if no LLM available
        return AIAnalyzer._mock_analysis(dq_results)

    @staticmethod
    def _call_databricks_llm(prompt):
        url = f"{config['host']}/serving-endpoints/{config['serving_endpoint']}/invocations"
        headers = {"Authorization": f"Bearer {config['token']}", "Content-Type": "application/json"}
        payload = {"messages": [{"role": "user", "content": prompt}]}
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        # Parse response (assuming chat format)
        content = response.json()['choices'][0]['message']['content']
        # Extract JSON from content if wrapped in markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        return json.loads(content)

    @staticmethod
    def _mock_analysis(dq_results):
        """Mock response for testing/demo without keys."""
        issues_count = len(dq_results.get("issues", []))
        return {
            "root_cause_analysis": f"Detected {issues_count} issues. Primary concerns involve null values and potential duplicates.",
            "pipeline_health": "At Risk" if issues_count > 2 else "Healthy",
            "recommended_sql_fixes": "DELETE FROM table WHERE id IS NULL;",
            "recommended_python_fixes": "df = df.dropna(subset=['critical_col'])",
            "delta_optimizations": ["Run OPTIMIZE on the table", "Run VACUUM to remove old files"],
            "summary": "Data quality is generally acceptable but requires attention to null handling."
        }
