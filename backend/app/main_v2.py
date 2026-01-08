"""
Production-ready FastAPI application with comprehensive error handling,
logging, security, and standardized responses.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import csv
from io import StringIO

from .config import get_settings
from .errors import (
    APIError,
    DataLoadError,
    OptimizationError,
    api_error_handler,
    general_exception_handler,
    http_exception_handler,
    validation_error_handler,
)
from .logger import logger
from .optimizer import solve_clinker_transport


def _sanitize_plant(plant: dict) -> None:
    # Coerce numeric fields and enforce non-negative/positive bounds to
    # satisfy pydantic validation and downstream solver expectations.
    prod_cost = plant.get("production_cost")
    plant["production_cost"] = float(prod_cost) if prod_cost is not None else 0.0

    holding_cost = plant.get("holding_cost")
    plant["holding_cost"] = max(0.0, float(holding_cost) if holding_cost is not None else 0.0)

    safety = max(0.0, float(plant.get("safety_stock") or 0.0))
    initial = max(0.0, float(plant.get("initial_inventory") or 0.0))
    max_cap = float(plant.get("max_capacity") or 0.0)

    if max_cap <= 0:
        max_cap = max(initial, safety, 1.0)
    if initial > max_cap:
        max_cap = initial
    if safety > max_cap:
        safety = max_cap

    plant["initial_inventory"] = initial
    plant["max_capacity"] = max_cap
    plant["safety_stock"] = safety

    # Optional cap on production per period: ensure non-negative
    if plant.get("max_production_per_period") is not None:
        plant["max_production_per_period"] = max(0.0, float(plant["max_production_per_period"]))


def _clean_routes(plants: list[dict], routes: list[dict]) -> list[dict]:
    plants_by_id = {p["id"]: p for p in plants}
    filtered_routes = []
    for route in routes:
        origin_id = route.get("origin_id")
        destination_id = route.get("destination_id")
        # Drop self-loops that violate validation
        if origin_id and destination_id and origin_id == destination_id:
            continue
        if origin_id in plants_by_id and plants_by_id[origin_id].get("type") == "IU":
            modes = [m for m in route.get("modes", []) if m.get("capacity_per_trip")]
            if modes:
                route["modes"] = [
                    {
                        **m,
                        "capacity_per_trip": max(0.0, float(m.get("capacity_per_trip") or 0.0)) or 1.0,
                        "unit_cost": max(0.0, float(m.get("unit_cost") or 0.0)),
                    }
                    for m in modes
                ]
                filtered_routes.append(route)
    return filtered_routes


def _load_and_clean_data(*, scenario: str, T: int, limit_plants: int, limit_routes: int, seed: int) -> dict:
    import sys
    from pathlib import Path

    backend_dir = Path(__file__).resolve().parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    from data_loader import get_initial_data

    data = get_initial_data(
        T=T,
        limit_plants=limit_plants,
        limit_routes=limit_routes,
        scenario_name=scenario,
        seed=seed,
    )

    for plant in data.get("plants", []):
        _sanitize_plant(plant)

    data["routes"] = _clean_routes(data.get("plants", []), data.get("routes", []))
    return data
from .schemas import ConstraintOptimizationRequest, ConstraintRow, OptimizationRequest, OptimizationResponse

# Import advanced endpoints
try:
    from .advanced_endpoints import router as advanced_router
    HAS_ADVANCED_FEATURES = True
except ImportError:
    HAS_ADVANCED_FEATURES = False
    logger.warning("Advanced features not available")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Debug mode: {settings.debug}")
    yield
    # Shutdown
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Optimization API for clinker transport network planning",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


# Security Middleware
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure this properly in production
    )


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(ValidationError, validation_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include advanced endpoints if available
if HAS_ADVANCED_FEATURES:
    app.include_router(advanced_router)
    logger.info("Advanced optimization features enabled")


# Middleware for logging requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response


@app.get("/", tags=["Health"])
def root() -> dict:
    """Root endpoint with API information."""
    return {
        "success": True,
        "data": {
            "service": settings.app_name,
            "version": settings.app_version,
            "status": "running",
            "endpoints": {
                "health": "/health",
                "optimize": "/optimize",
                "initial_data": "/initial-data",
                "sustainability": "/sustainability-data",
                "docs": "/docs" if settings.debug else "disabled"
            }
        }
    }


@app.get("/health", tags=["Health"])
def health() -> dict:
    """Health check endpoint."""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "environment": settings.app_env,
            "version": settings.app_version
        }
    }


@app.post("/optimize", response_model=OptimizationResponse, tags=["Optimization"])
def optimize(req: OptimizationRequest) -> OptimizationResponse:
    """
    Optimize clinker transport network.
    
    Solves a multi-period MILP for minimizing production, transportation,
    and inventory holding costs while satisfying demand and capacity constraints.
    """
    try:
        logger.info(f"Optimization request: T={req.T}, {len(req.plants)} plants, {len(req.routes)} routes")
        
        result = solve_clinker_transport(req)
        
        logger.info(f"Optimization completed: status={result.status}")
        
        return OptimizationResponse(
            status=result.status,
            total_cost=result.total_cost,
            scheduled_trips=result.scheduled_trips,
            message=result.message,
        )
    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}", exc_info=True)
        raise OptimizationError(
            message="Optimization failed",
            details={"error": str(e)}
        )


@app.post("/optimize-with-constraints", response_model=OptimizationResponse, tags=["Optimization"])
def optimize_with_constraints(req: ConstraintOptimizationRequest) -> OptimizationResponse:
    """Optimize with additional IU/GU/mode constraints (IUGUConstraint.csv semantics)."""
    try:
        logger.info(
            f"Constraint optimization: T={req.T}, {len(req.plants)} plants, {len(req.routes)} routes, "
            f"constraints={len(req.constraints)}"
        )

        result = solve_clinker_transport(req, constraint_rows=req.constraints)

        logger.info(f"Constraint optimization completed: status={result.status}")

        return OptimizationResponse(
            status=result.status,
            total_cost=result.total_cost,
            scheduled_trips=result.scheduled_trips,
            message=result.message,
        )
    except Exception as e:
        logger.error(f"Constraint optimization failed: {str(e)}", exc_info=True)
        raise OptimizationError(
            message="Optimization with constraints failed",
            details={"error": str(e)}
        )


@app.get("/optimize", tags=["Optimization"])
def optimize_info() -> dict:
    """Information about the optimize endpoint."""
    return {
        "success": True,
        "data": {
            "message": "Use POST /optimize with a JSON OptimizationRequest body.",
            "docs": "/docs" if settings.debug else "See API documentation"
        }
    }


@app.get("/initial-data", tags=["Data"])
def initial_data(
    scenario: Optional[str] = Query(default="Base", description="Scenario name"),
    T: Optional[int] = Query(default=settings.default_periods, ge=1, le=settings.max_periods, description="Number of periods"),
    limit_plants: Optional[int] = Query(default=240, ge=1, le=settings.max_plants, description="Maximum number of plants"),
    limit_routes: Optional[int] = Query(default=250, ge=1, le=settings.max_routes, description="Maximum number of routes"),
    seed: Optional[int] = Query(default=42, description="Random seed for reproducibility"),
) -> dict:
    """
    Get initial network data for optimization.
    
    Returns plant configurations, transportation routes, and demand forecasts.
    Automatically filters routes to only include IU (Integrated Unit) origins.
    """
    try:
        logger.info(f"Initial data request: scenario={scenario}, T={T}, plants={limit_plants}, routes={limit_routes}")
        
        # Import here to avoid circular dependency issues
        import sys
        from pathlib import Path
        
        # Add backend directory to path to import data_loader
        backend_dir = Path(__file__).resolve().parent.parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        
        from data_loader import get_initial_data
        
        data = _load_and_clean_data(
            scenario=scenario,
            T=T,
            limit_plants=limit_plants,
            limit_routes=limit_routes,
            seed=seed,
        )
        
        logger.info(f"Initial data loaded: {len(data['plants'])} plants, {len(data['routes'])} routes")
        
        return {
            "success": True,
            "data": data
        }
        
    except Exception as e:
        logger.error(f"Failed to load initial data: {str(e)}", exc_info=True)
        raise DataLoadError(
            message="Failed to load initial data",
            details={"error": str(e)}
        )


def _parse_constraint_csv(file: UploadFile) -> list[ConstraintRow]:
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(StringIO(content))
    rows: list[ConstraintRow] = []
    for raw in reader:
        try:
            rows.append(
                ConstraintRow(
                    iu_code=(raw.get("IU CODE") or raw.get("IU_CODE") or raw.get("iu_code") or "").strip(),
                    transport_code=(raw.get("TRANSPORT CODE") or raw.get("TRANSPORT_CODE") or raw.get("mode") or None),
                    iugu_code=(raw.get("IUGU CODE") or raw.get("IUGU_CODE") or raw.get("iugu_code") or None),
                    time_period=int(float(raw.get("TIME PERIOD") or raw.get("TIME_PERIOD") or raw.get("time_period") or 0)),
                    bound_type=(raw.get("BOUND TYPEID") or raw.get("BOUND") or raw.get("bound_type") or "").strip().upper(),
                    value_type=(raw.get("VALUE TYPEID") or raw.get("value_type") or None),
                    value=float(raw.get("Value") or raw.get("VALUE") or raw.get("value") or 0.0),
                )
            )
        except Exception:
            continue
    return rows


@app.get("/sustainability-data", tags=["Data"])
def sustainability_data(
    period: str = Query(default="monthly", description="Time period: daily, weekly, monthly, quarterly, yearly")
) -> dict:
    """
    Get sustainability metrics filtered by time period.
    
    Returns transport emissions, costs, and carbon intensity data
    scaled according to the selected time period.
    """
    try:
        logger.info(f"Sustainability data request: period={period}")
        
        # Validate period
        valid_periods = ["daily", "weekly", "monthly", "quarterly", "yearly"]
        if period.lower() not in valid_periods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
            )
        
        # Base data - in production, this would come from a database
        base_data = [
            {
                "id": "rail-001",
                "mode": "rail",
                "distance": 320,
                "tonnage": 5000,
                "co2PerTonKm": 0.032,
                "totalEmissions": 51200,
                "cost": 145000,
                "carbonIntensity": 0.353,
            },
            {
                "id": "road-001",
                "mode": "road",
                "distance": 280,
                "tonnage": 3500,
                "co2PerTonKm": 0.089,
                "totalEmissions": 87220,
                "cost": 178000,
                "carbonIntensity": 0.490,
            },
            {
                "id": "rail-002",
                "mode": "rail",
                "distance": 295,
                "tonnage": 4500,
                "co2PerTonKm": 0.030,
                "totalEmissions": 39825,
                "cost": 132000,
                "carbonIntensity": 0.302,
            },
            {
                "id": "multimodal-001",
                "mode": "multimodal",
                "distance": 410,
                "tonnage": 4000,
                "co2PerTonKm": 0.055,
                "totalEmissions": 90200,
                "cost": 168000,
                "carbonIntensity": 0.420,
            },
            {
                "id": "road-002",
                "mode": "road",
                "distance": 195,
                "tonnage": 2800,
                "co2PerTonKm": 0.092,
                "totalEmissions": 50232,
                "cost": 124000,
                "carbonIntensity": 0.443,
            },
            {
                "id": "rail-003",
                "mode": "rail",
                "distance": 385,
                "tonnage": 5200,
                "co2PerTonKm": 0.028,
                "totalEmissions": 56056,
                "cost": 158000,
                "carbonIntensity": 0.304,
            },
            {
                "id": "multimodal-002",
                "mode": "multimodal",
                "distance": 340,
                "tonnage": 3800,
                "co2PerTonKm": 0.058,
                "totalEmissions": 74936,
                "cost": 152000,
                "carbonIntensity": 0.400,
            },
        ]

        # Scale data based on period
        period_multipliers = {
            "daily": 0.033,
            "weekly": 0.23,
            "monthly": 1.0,
            "quarterly": 3.0,
            "yearly": 12.0,
        }
        multiplier = period_multipliers.get(period.lower(), 1.0)

        scaled_data = []
        for item in base_data:
            scaled_item = item.copy()
            scaled_item["tonnage"] = int(item["tonnage"] * multiplier)
            scaled_item["totalEmissions"] = int(item["totalEmissions"] * multiplier)
            scaled_item["cost"] = int(item["cost"] * multiplier)
            scaled_data.append(scaled_item)

        logger.info(f"Sustainability data returned: {len(scaled_data)} records for period={period}")
        
        return {
            "success": True,
            "data": {
                "period": period,
                "data": scaled_data
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to load sustainability data: {str(e)}", exc_info=True)
        raise DataLoadError(
            message="Failed to load sustainability data",
            details={"error": str(e)}
        )


@app.post("/optimize-with-constraints/upload", response_model=OptimizationResponse, tags=["Optimization"])
async def optimize_with_constraints_upload(
    request: Request,
    constraints_file: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    scenario: str = Query(default="Base"),
    T: int = Query(default=settings.default_periods, ge=1, le=settings.max_periods),
    limit_plants: int = Query(default=240, ge=1, le=settings.max_plants),
    limit_routes: int = Query(default=250, ge=1, le=settings.max_routes),
    seed: int = Query(default=42),
) -> OptimizationResponse:
    """Upload an IUGUConstraint.csv file and solve using the server's real_data inputs.

    Accepts multipart field names "constraints_file" (preferred) or legacy "file" for compatibility.
    Also falls back to scanning the submitted form for any file if names differ.
    """
    try:
        upload = constraints_file or file
        if upload is None:
            try:
                form = await request.form()
                # pick first file if present
                for _, v in form.multi_items():
                    if isinstance(v, UploadFile):
                        upload = v
                        break
            except Exception:
                upload = None

        if upload is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="constraints_file is required")

        constraint_rows = _parse_constraint_csv(upload)

        data = _load_and_clean_data(
            scenario=scenario,
            T=T,
            limit_plants=limit_plants,
            limit_routes=limit_routes,
            seed=seed,
        )

        req = ConstraintOptimizationRequest(
            T=data["T"],
            plants=data["plants"],
            routes=data["routes"],
            demand=data["demand"],
            constraints=constraint_rows,
        )

        result = solve_clinker_transport(req, constraint_rows=req.constraints)

        return OptimizationResponse(
            status=result.status,
            total_cost=result.total_cost,
            scheduled_trips=result.scheduled_trips,
            message=result.message,
        )
    except Exception as e:
        logger.error(f"Constraint upload optimization failed: {str(e)}", exc_info=True)
        raise OptimizationError(
            message="Optimization with uploaded constraints failed",
            details={"error": str(e)}
        )
