from __future__ import annotations

from typing import Optional
import tempfile
import os
from pathlib import Path

from fastapi import FastAPI, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

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


# ===== Advanced Optimization Endpoints (Real CSV Data) =====
from .csv_data_loader import (
    get_data_summary,
    get_sources as get_csv_sources,
    get_destinations as get_csv_destinations,
    get_transport_modes,
    get_periods as get_csv_periods,
    get_route_data as get_csv_route_data
)
from .milp_optimizer import calculate_milp_solution
from .excel_data_loader import (
    get_data_from_store,
    get_sources_from_store,
    get_destinations_from_store,
    get_transport_modes_from_store,
    get_periods_from_store,
    calculate_milp_from_store
)

# Global storage for uploaded data
uploaded_data_store = {}

@app.post("/api/upload")
async def upload_excel(file: UploadFile = File(...)):
    """Process uploaded Excel file and extract all required sheets."""
    tmp_path = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Read Excel file and extract all sheets - use context manager to ensure proper closing
        with pd.ExcelFile(tmp_path) as excel_file:
            sheets_found = excel_file.sheet_names
            
            # Required sheets
            required_sheets = {
                "IUGUType": None,
                "LogisticsIUGU": None,
                "ClinkerCapacity": None,
                "ClinkerDemand": None,
                "ProductionCost": None,
                "IUGUOpeningStock": None,
                "IUGUClosingStock": None
            }
            
            # Load each sheet
            for sheet_name in required_sheets.keys():
                if sheet_name in sheets_found:
                    required_sheets[sheet_name] = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        # Store in global variable for other endpoints to use
        global uploaded_data_store
        uploaded_data_store = required_sheets
        
        # Extract metadata
        logistics_df = required_sheets.get("LogisticsIUGU")
        if logistics_df is not None:
            # Filter out Sea routes (T3)
            logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
            total_routes = len(logistics_df)
            periods = sorted(logistics_df['TIME PERIOD'].unique().astype(str).tolist())
            total_periods = len(periods)
        else:
            total_routes = 0
            periods = []
            total_periods = 0
        
        # Count unique plants
        iugu_type_df = required_sheets.get("IUGUType")
        total_plants = len(iugu_type_df) if iugu_type_df is not None else 0
        
        # Clean up temp file - now safe to delete after ExcelFile context manager closed
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                # Log but don't fail if cleanup fails
                print(f"Warning: Could not delete temp file {tmp_path}: {cleanup_error}")
        
        return {
            "success": True,
            "message": f"Successfully loaded {len([s for s in required_sheets.values() if s is not None])} sheets from {file.filename}",
            "sheets_found": [s for s in required_sheets.keys() if required_sheets[s] is not None],
            "total_routes": total_routes,
            "total_plants": total_plants,
            "total_periods": total_periods,
            "periods": periods,
            "warnings": []
        }
        
    except Exception as e:
        # Cleanup temp file in case of error
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
        
        return {
            "success": False,
            "message": f"Failed to process file: {str(e)}",
            "errors": [str(e)]
        }


@app.post("/api/load-default")
async def load_default():
    """Load default CSV data from real_data folder."""
    return get_data_summary()


@app.get("/api/sources")
async def get_sources():
    """Get source plants (IU codes only, excluding Sea routes). Uses uploaded data if available, otherwise CSV."""
    global uploaded_data_store
    if uploaded_data_store:
        sources = get_sources_from_store(uploaded_data_store)
        return {"sources": sources, "source": "uploaded"}
    else:
        sources = get_csv_sources()
        return {"sources": sources, "source": "csv"}


@app.get("/api/destinations/{source}")
async def get_destinations(source: str):
    """Get destinations for a source (excluding Sea routes). Uses uploaded data if available, otherwise CSV."""
    global uploaded_data_store
    if uploaded_data_store:
        destinations = get_destinations_from_store(uploaded_data_store, source)
        return {"destinations": destinations, "source": "uploaded"}
    else:
        destinations = get_csv_destinations(source)
        return {"destinations": destinations, "source": "csv"}


@app.get("/api/modes/{source}/{destination}")
async def get_modes(source: str, destination: str):
    """Get transport modes for a route (Road and Rail only, no Sea). Uses uploaded data if available, otherwise CSV."""
    global uploaded_data_store
    if uploaded_data_store:
        modes = get_transport_modes_from_store(uploaded_data_store, source, destination)
        return {"modes": modes, "source": "uploaded"}
    else:
        modes = get_transport_modes(source, destination)
        return {"modes": modes, "source": "csv"}


@app.get("/api/periods")
async def get_periods():
    """Get time periods. Uses uploaded data if available, otherwise CSV."""
    global uploaded_data_store
    if uploaded_data_store:
        periods = get_periods_from_store(uploaded_data_store)
        return {"periods": periods, "source": "uploaded"}
    else:
        periods = get_csv_periods()
        return {"periods": periods, "source": "csv"}


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
async def get_route_analysis(
    source: str = Query(..., description="Source plant code"),
    destination: str = Query(..., description="Destination plant code"),
    mode: str = Query(..., description="Transport mode code"),
    period: str = Query(..., description="Time period")
):
    """Get complete MILP optimization solution. Uses uploaded data if available, otherwise CSV data (excludes Sea routes)."""
    global uploaded_data_store
    try:
        if uploaded_data_store:
            milp_result = calculate_milp_from_store(uploaded_data_store, source, destination, mode, period)
            milp_result["data_source"] = "uploaded"
        else:
            milp_result = calculate_milp_solution(source, destination, mode, int(period))
            milp_result["data_source"] = "csv"
        return milp_result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
