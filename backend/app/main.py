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


# ===== Advanced Optimization Endpoints (Mock) =====
@app.post("/api/upload")
async def upload_excel():
    """Mock endpoint for Excel upload - returns success with dummy data."""
    return {
        "success": True,
        "message": "File uploaded successfully (MOCK)",
        "sheets_found": ["IUGUType", "LogisticsIUGU", "ClinkerCapacity", "ClinkerDemand", "ProductionCost", "IUGUOpeningStock", "IUGUClosingStock"],
        "total_routes": 150,
        "total_plants": 25,
        "total_periods": 12,
        "periods": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        "warnings": ["⚠️ Mock endpoint - backend implementation required"]
    }


@app.post("/api/load-default")
async def load_default():
    """Mock endpoint to load default data."""
    return {
        "success": True,
        "message": "Default data loaded (MOCK)",
        "sheets_found": ["IUGUType", "LogisticsIUGU", "ClinkerCapacity", "ClinkerDemand", "ProductionCost", "IUGUOpeningStock", "IUGUClosingStock"],
        "total_routes": 150,
        "total_plants": 25,
        "total_periods": 12,
        "periods": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    }


@app.get("/api/sources")
async def get_sources():
    """Mock endpoint - returns sample source plants."""
    return {
        "sources": ["IU001", "IU002", "IU003", "IU004", "IU005"]
    }


@app.get("/api/destinations/{source}")
async def get_destinations(source: str):
    """Mock endpoint - returns sample destinations."""
    return {
        "destinations": ["IUGU001", "IUGU002", "IUGU003", "IUGU004"]
    }


@app.get("/api/modes/{source}/{destination}")
async def get_modes(source: str, destination: str):
    """Mock endpoint - returns transport modes."""
    return {
        "modes": [
            {"code": "T1", "name": "Road", "vehicle_capacity": 25},
            {"code": "T2", "name": "Rail", "vehicle_capacity": 100},
            {"code": "T3", "name": "Sea", "vehicle_capacity": 500}
        ]
    }


@app.get("/api/periods")
async def get_periods():
    """Mock endpoint - returns time periods."""
    return {
        "periods": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    }


@app.get("/api/model")
async def get_mathematical_model():
    """Return the mathematical model formulation."""
    return {
        "success": True,
        "model": {
            "name": "Multi-Period Clinker Supply Chain MILP",
            "type": "Mixed Integer Linear Programming (MILP)",
            "objective": {
                "type": "Minimize",
                "description": "Total supply chain cost across all periods",
                "formula": "Z = Σ(Production Cost) + Σ(Transport Cost) + Σ(Holding Cost)",
                "components": [
                    {"name": "Production Cost", "formula": "Σ(P[i,t] × PC[i])", "unit": "₹/ton"},
                    {"name": "Transport Cost", "formula": "Σ(X[i,j,m,t] × TC[i,j,m])", "unit": "₹/ton"},
                    {"name": "Holding Cost", "formula": "Σ(I[i,t] × HC[i])", "unit": "₹/ton"}
                ]
            },
            "decision_variables": [
                {"symbol": "P[i,t]", "description": "Production at plant i in period t", "unit": "tons", "domain": "Continuous ≥ 0"},
                {"symbol": "X[i,j,m,t]", "description": "Shipment from i to j via mode m in period t", "unit": "tons", "domain": "Continuous ≥ 0"},
                {"symbol": "I[i,t]", "description": "Inventory at plant i at end of period t", "unit": "tons", "domain": "Continuous ≥ 0"},
                {"symbol": "T[i,j,m,t]", "description": "Number of trips from i to j via mode m in period t", "unit": "trips", "domain": "Integer ≥ 0"}
            ],
            "constraints": [
                {"name": "Mass Balance", "formula": "I[i,t-1] + P[i,t] + Σ(inbound) = Σ(outbound) + D[i,t] + I[i,t]", "description": "Conservation of flow at each node", "scope": "∀i, ∀t"},
                {"name": "Production Capacity", "formula": "P[i,t] ≤ CAP[i]", "description": "Production cannot exceed plant capacity", "scope": "∀i, ∀t"},
                {"name": "Transport Capacity", "formula": "X[i,j,m,t] ≤ T[i,j,m,t] × VC[m]", "description": "Shipment must fit in allocated trips", "scope": "∀i,j,m,t"},
                {"name": "Inventory Bounds", "formula": "I_min[i] ≤ I[i,t] ≤ I_max[i]", "description": "Inventory must stay within safety limits", "scope": "∀i, ∀t"},
                {"name": "Initial Inventory", "formula": "I[i,0] = I_0[i]", "description": "Starting inventory must equal opening stock", "scope": "∀i"},
                {"name": "Final Inventory", "formula": "I[i,T] = I_f[i]", "description": "Ending inventory must match closing stock requirement", "scope": "∀i"}
            ],
            "indices": [
                {"symbol": "i", "description": "Source plant (IU)", "set": "I = {all IU plants}"},
                {"symbol": "j", "description": "Destination plant (IUGU)", "set": "J = {all IUGU plants}"},
                {"symbol": "m", "description": "Transport mode", "set": "M = {Road, Rail, Sea}"},
                {"symbol": "t", "description": "Time period", "set": "T = {1,2,...,12}"}
            ],
            "parameters": [
                {"symbol": "PC[i]", "description": "Production cost at plant i", "source": "ProductionCost sheet"},
                {"symbol": "TC[i,j,m]", "description": "Transport cost from i to j via mode m", "source": "LogisticsIUGU sheet"},
                {"symbol": "HC[i]", "description": "Holding cost per ton at plant i", "source": "IUGUOpeningStock sheet"},
                {"symbol": "CAP[i]", "description": "Production capacity at plant i", "source": "ClinkerCapacity sheet"},
                {"symbol": "D[j,t]", "description": "Demand at plant j in period t", "source": "ClinkerDemand sheet"},
                {"symbol": "VC[m]", "description": "Vehicle capacity for mode m", "source": "IUGUType sheet"},
                {"symbol": "I_0[i]", "description": "Opening inventory at plant i", "source": "IUGUOpeningStock sheet"},
                {"symbol": "I_f[i]", "description": "Required closing inventory at plant i", "source": "IUGUClosingStock sheet"}
            ]
        }
    }


@app.get("/api/route")
async def get_route_analysis():
    """Mock endpoint - returns MILP analysis results."""
    return {
        "success": False,
        "error": "⚠️ Mock endpoint - Full MILP solver implementation required. Please implement ClinkerOptimizer class from GitHub repo."
    }
