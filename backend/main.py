from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data_loader import get_initial_data
from solver_logic import OptimizationRequest, OptimizationResponse, solve_with_emergency_fallback


app = FastAPI(
    title="Supply Chain Optimization API",
    version="1.0.0",
)

# CORS for Next.js local dev (per requirement)
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
        "service": "Supply Chain Optimization API",
        "health": "/health",
        "optimize": "/optimize",
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/initial-data")
def initial_data(
    scenario: str = "Base",
    T: int = 4,
    limit_plants: int = 240,
    limit_routes: int = 250,
    seed: int = 42,
) -> dict:
    """Return a compact subset of the uploaded CSV data as JSON.

    Frontend uses this to populate tables/charts/maps without hardcoded mock data.
    """

    return get_initial_data(
        scenario_name=scenario,
        T=T,
        limit_plants=limit_plants,
        limit_routes=limit_routes,
        seed=seed,
    )


@app.post("/optimize", response_model=OptimizationResponse)
def optimize(req: OptimizationRequest) -> OptimizationResponse:
    result = solve_with_emergency_fallback(req)
    status = result.status

    # Normalize to the frontend union type
    if status not in {"Optimal", "Infeasible", "Unbounded", "Not Solved", "Error"}:
        status = "Not Solved"

    return OptimizationResponse(
        status=status, total_cost=result.total_cost, scheduled_trips=result.scheduled_trips, message=result.message
    )


@app.get("/optimize")
def optimize_get() -> dict:
    return {
        "message": "Use POST /optimize with a JSON OptimizationRequest body.",
        "example": {
            "method": "POST",
            "path": "/optimize",
            "content_type": "application/json",
        },
    }
