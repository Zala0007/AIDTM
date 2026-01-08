from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .optimizer import solve_clinker_transport
from .schemas import OptimizationRequest, OptimizationResponse


app = FastAPI(title="ClinkerFlow Optimization API", version="0.1.0")

# Allow Next.js local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4028",
        "http://127.0.0.1:4028",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {
        "service": "ClinkerFlow Optimization API",
        "health": "/health",
        "optimize": "/optimize",
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/optimize", response_model=OptimizationResponse)
def optimize(req: OptimizationRequest) -> OptimizationResponse:
    result = solve_clinker_transport(req)
    return OptimizationResponse(
        status=result.status,
        total_cost=result.total_cost,
        scheduled_trips=result.scheduled_trips,
        message=result.message,
    )


@app.get("/optimize")
def optimize_get() -> dict:
    return {
        "message": "Use POST /optimize with a JSON OptimizationRequest body.",
        "docs": "/docs",
    }


@app.get("/initial-data")
def initial_data(
    scenario: Optional[str] = Query(default="Base"),
    T: Optional[int] = Query(default=4, ge=1, le=12),
    limit_plants: Optional[int] = Query(default=240, ge=1),
    limit_routes: Optional[int] = Query(default=250, ge=1),
    seed: Optional[int] = Query(default=42),
) -> dict:
    """Return initial plant, route, and demand data for network optimization."""
    try:
        # Import here to avoid circular dependency issues
        import sys
        from pathlib import Path
        
        # Add backend directory to path to import data_loader
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
        
        # Clean plant data: convert null production_cost to 0.0 (but keep max_production_per_period as None if null)
        for plant in data.get("plants", []):
            if plant.get("production_cost") is None:
                plant["production_cost"] = 0.0
        
        # Filter routes: only include routes where origin is an IU
        # (business rule: only IUs can ship clinker to other plants)
        plants_by_id = {p["id"]: p for p in data.get("plants", [])}
        filtered_routes = []
        for route in data.get("routes", []):
            origin_id = route.get("origin_id")
            if origin_id in plants_by_id and plants_by_id[origin_id].get("type") == "IU":
                # Also ensure the route has valid modes array
                if "modes" in route and isinstance(route["modes"], list) and len(route["modes"]) > 0:
                    filtered_routes.append(route)
        
        data["routes"] = filtered_routes
        
        return data
    except Exception as e:
        # Return a minimal valid response if data loading fails
        return {
            "T": T,
            "scenario": scenario,
            "plants": [],
            "routes": [],
            "demand": {},
            "error": str(e),
        }


@app.get("/sustainability-data")
def sustainability_data(period: str = "monthly") -> dict:
    """Return transport emissions data filtered by period."""
    # Mock data - in production, this would query a database with period-based aggregation
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

    # Scale data based on period (simulate aggregation)
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

    return {"period": period, "data": scaled_data}
