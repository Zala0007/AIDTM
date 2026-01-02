"""
Configuration management for Clinker DSS.

Loads and validates configuration from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import Optional, List
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False
    api_workers: int = 4
    
    # Solver Configuration
    solver_name: str = "gurobi"
    solver_path: Optional[str] = None
    solver_time_limit: int = 300
    solver_mip_gap: float = 0.01
    solver_threads: int = 4
    solver_log_output: bool = False
    
    # Optimization Configuration
    optimization_enable_warmstart: bool = True
    optimization_presolve: int = 2
    optimization_focus: int = 1
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/clinker_dss.log"
    
    # Database
    database_url: str = "sqlite:///./clinker_dss.db"
    database_echo: bool = False
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]
    
    # Paths
    data_dir: str = "./data"
    sample_data_dir: str = "./data/samples"
    export_dir: str = "./exports"
    
    # Features
    feature_consolidation_analysis: bool = True
    feature_uncertainty_analysis: bool = True
    feature_scenario_comparison: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


def get_settings() -> Settings:
    """Get application settings."""
    return Settings()


def validate_settings(settings: Settings) -> tuple[bool, list[str]]:
    """
    Validate settings and check for required resources.
    
    Returns:
        Tuple of (is_valid, list of warnings/errors)
    """
    issues = []
    
    # Check solver availability
    try:
        from pyomo.opt import SolverFactory
        solver = SolverFactory(settings.solver_name)
        if not solver.available():
            issues.append(
                f"⚠ Solver '{settings.solver_name}' not available. "
                f"Install with: pip install {settings.solver_name}"
            )
    except Exception as e:
        issues.append(f"✗ Error checking solver: {e}")
    
    # Check directory existence
    for dir_path in [settings.data_dir, settings.export_dir]:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    # Check Gurobi license (if using Gurobi)
    if settings.solver_name == "gurobi":
        gurobi_home = os.environ.get("GUROBI_HOME")
        if not gurobi_home:
            issues.append(
                "⚠ GUROBI_HOME environment variable not set. "
                "Gurobi may not work without proper license setup."
            )
    
    return len([i for i in issues if i.startswith("✗")]) == 0, issues


# Load settings on module import
settings = get_settings()
is_valid, validation_issues = validate_settings(settings)

if validation_issues:
    import logging
    logger = logging.getLogger(__name__)
    for issue in validation_issues:
        if issue.startswith("✗"):
            logger.error(issue)
        else:
            logger.warning(issue)
