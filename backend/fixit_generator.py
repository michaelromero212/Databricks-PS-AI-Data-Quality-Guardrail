from utils import get_logger

logger = get_logger(__name__)

class FixItGenerator:
    @staticmethod
    def generate_notebook(dq_results, ai_analysis):
        """Generates a Databricks notebook in SOURCE format (.py)."""
        logger.info("Generating Fix-It notebook...")
        
        # Header
        notebook_content = "# Databricks notebook source\n"
        notebook_content += "# MAGIC %md\n"
        notebook_content += "# # Auto-Generated Fix-It Notebook\n"
        notebook_content += f"# Generated based on DQ Score: {dq_results.get('dq_score')}\n\n"
        
        # Analysis Section
        notebook_content += "# COMMAND ----------\n\n"
        notebook_content += "# MAGIC %md\n"
        notebook_content += "## AI Analysis Summary\n"
        notebook_content += f"{ai_analysis.get('summary')}\n\n"
        
        # SQL Fixes
        notebook_content += "# COMMAND ----------\n\n"
        notebook_content += "# MAGIC %sql\n"
        notebook_content += f"-- Recommended SQL Fixes\n"
        notebook_content += f"{ai_analysis.get('recommended_sql_fixes')}\n\n"
        
        # Python Fixes
        notebook_content += "# COMMAND ----------\n\n"
        notebook_content += "# MAGIC %python\n"
        notebook_content += f"# Recommended Python Fixes\n"
        notebook_content += f"{ai_analysis.get('recommended_python_fixes')}\n\n"
        
        # Optimizations
        notebook_content += "# COMMAND ----------\n\n"
        notebook_content += "# MAGIC %sql\n"
        notebook_content += "-- Delta Optimizations\n"
        for opt in ai_analysis.get("delta_optimizations", []):
            notebook_content += f"-- {opt}\n"
            if "OPTIMIZE" in opt.upper():
                notebook_content += "OPTIMIZE table_name;\n"
            if "VACUUM" in opt.upper():
                notebook_content += "VACUUM table_name;\n"
        
        return notebook_content
