from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Literal, Optional, Tuple

import pulp
from pydantic import BaseModel, ConfigDict, Field, model_validator


# -----------------------------
# Pydantic models (match frontend)
# -----------------------------

PlantType = Literal["IU", "GU"]


class Plant(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str = Field(..., min_length=1)
    name: Optional[str] = None
    type: PlantType

    initial_inventory: float = Field(..., ge=0)
    max_capacity: float = Field(..., gt=0)
    safety_stock: float = Field(..., ge=0)

    holding_cost: Optional[float] = Field(None, ge=0)
    production_cost: Optional[float] = Field(None, ge=0)
    max_production_per_period: Optional[float] = Field(None, gt=0)

    @model_validator(mode="after")
    def _validate_bounds(self) -> "Plant":
        if self.initial_inventory > self.max_capacity:
            raise ValueError("initial_inventory cannot exceed max_capacity")
        if self.safety_stock > self.max_capacity:
            raise ValueError("safety_stock cannot exceed max_capacity")
        if self.type == "GU" and self.max_production_per_period is not None:
            raise ValueError("max_production_per_period is only valid for IU plants")
        return self


class RouteMode(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    mode: str = Field(..., min_length=1)
    unit_cost: float = Field(..., ge=0)
    capacity_per_trip: float = Field(..., gt=0)


class TransportationRoute(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str = Field(..., min_length=1)
    origin_id: str = Field(..., min_length=1)
    destination_id: str = Field(..., min_length=1)
    minimum_shipment_batch_quantity: float = Field(..., ge=0)
    modes: List[RouteMode] = Field(..., min_length=1)


class OptimizationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    # Frontend marks T and demand optional.
    T: Optional[int] = Field(None, ge=1, le=52)
    plants: List[Plant] = Field(..., min_length=1)
    routes: List[TransportationRoute] = Field(...)
    demand: Optional[Dict[str, List[float]]] = None

    @model_validator(mode="after")
    def _validate_topology(self) -> "OptimizationRequest":
        # Basic referential integrity against frontend IDs.
        plant_ids = [p.id for p in self.plants]
        if len(set(plant_ids)) != len(plant_ids):
            raise ValueError("Duplicate plant ids found")

        plants_by_id = {p.id: p for p in self.plants}

        for r in self.routes:
            if r.origin_id not in plants_by_id:
                raise ValueError(f"Route '{r.id}' has unknown origin_id '{r.origin_id}'")
            if r.destination_id not in plants_by_id:
                raise ValueError(
                    f"Route '{r.id}' has unknown destination_id '{r.destination_id}'"
                )
            if r.origin_id == r.destination_id:
                raise ValueError(f"Route '{r.id}' origin_id equals destination_id")

        if self.demand is not None:
            T = self.T or 4
            for plant_id, series in self.demand.items():
                if plant_id not in plants_by_id:
                    raise ValueError(f"Demand specified for unknown plant '{plant_id}'")
                if len(series) != T:
                    raise ValueError(f"Demand for plant '{plant_id}' must have length T={T}")
                if any(d < 0 for d in series):
                    raise ValueError(f"Demand for plant '{plant_id}' contains negative values")

        return self


class ScheduledTrip(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    period: int = Field(..., ge=1)
    route_id: str
    origin_id: str
    destination_id: str
    mode: str
    num_trips: int = Field(..., ge=0)
    quantity_shipped: float = Field(..., ge=0)


class OptimizationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    status: Literal["Optimal", "Infeasible", "Unbounded", "Not Solved", "Error"]
    total_cost: Optional[float] = None
    scheduled_trips: List[ScheduledTrip] = Field(default_factory=list)
    message: Optional[str] = None


# -----------------------------
# Solver
# -----------------------------


@dataclass(frozen=True)
class SolveResult:
    status: str
    total_cost: Optional[float]
    scheduled_trips: List[ScheduledTrip]
    message: Optional[str] = None


def solve_supply_chain(
    req: OptimizationRequest,
    *,
    emergency_unit_cost: float = 1_000_000.0,
    enable_emergency_sourcing: bool = False,
) -> SolveResult:
    """Multi-period supply chain MILP using PuLP.

    Decision variables required by spec:
    - Total Quantity: Q[r,mode,t] (continuous)
    - Number of Trips: Trips[r,mode,t] (integer)

    Inventory balance equation (per plant p and period t):
      I_t = I_{t-1} + P_t + R_t - S_t - D_t

    Where:
      - I_t: ending inventory
      - P_t: production (IUs only)
      - R_t: received quantity (inbound shipments + optional emergency sourcing)
      - S_t: shipped quantity (outbound shipments)
      - D_t: demand

    Safety stock constraint:
      I_t >= safety_stock

    Emergency sourcing (penalty-variable logic):
      If enabled, add Emergency[p,t] >= 0 to received, with very high unit cost.
      This makes the model feasible even when normal capacity cannot meet demand.
    """

    T = req.T or 4
    plants = req.plants
    routes = req.routes
    plants_by_id = {p.id: p for p in plants}

    # demand[(plant_id, t)] = value
    demand: Dict[Tuple[str, int], float] = {}
    demand_input = req.demand or {}
    for plant_id in plants_by_id:
        series = demand_input.get(plant_id, [0.0] * T)
        for t in range(1, T + 1):
            demand[(plant_id, t)] = float(series[t - 1])

    model = pulp.LpProblem("multi_period_supply_chain", pulp.LpMinimize)

    inv = pulp.LpVariable.dicts(
        "Inv",
        ((p.id, t) for p in plants for t in range(1, T + 1)),
        lowBound=0,
        cat=pulp.LpContinuous,
    )

    prod = pulp.LpVariable.dicts(
        "Prod",
        ((p.id, t) for p in plants if p.type == "IU" for t in range(1, T + 1)),
        lowBound=0,
        cat=pulp.LpContinuous,
    )

    q: Dict[Tuple[str, str, int], pulp.LpVariable] = {}
    trips: Dict[Tuple[str, str, int], pulp.LpVariable] = {}

    for r in routes:
        for mode in r.modes:
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                q[key] = pulp.LpVariable(
                    f"Q_{r.id}_{mode.mode}_{t}", lowBound=0, cat=pulp.LpContinuous
                )
                trips[key] = pulp.LpVariable(
                    f"Trips_{r.id}_{mode.mode}_{t}", lowBound=0, cat=pulp.LpInteger
                )

    emergency: Dict[Tuple[str, int], pulp.LpVariable] = {}
    if enable_emergency_sourcing:
        for p in plants:
            for t in range(1, T + 1):
                emergency[(p.id, t)] = pulp.LpVariable(
                    f"Emergency_{p.id}_{t}", lowBound=0, cat=pulp.LpContinuous
                )

    # Objective
    production_cost_terms = []
    holding_cost_terms = []
    transport_cost_terms = []
    emergency_cost_terms = []

    for p in plants:
        holding = float(p.holding_cost or 0.0)
        for t in range(1, T + 1):
            holding_cost_terms.append(holding * inv[(p.id, t)])

        if p.type == "IU":
            prod_cost = float(p.production_cost or 0.0)
            for t in range(1, T + 1):
                production_cost_terms.append(prod_cost * prod[(p.id, t)])

    for r in routes:
        for mode in r.modes:
            unit_cost = float(mode.unit_cost)
            for t in range(1, T + 1):
                transport_cost_terms.append(unit_cost * q[(r.id, mode.mode, t)])

    if enable_emergency_sourcing:
        for p in plants:
            for t in range(1, T + 1):
                emergency_cost_terms.append(emergency_unit_cost * emergency[(p.id, t)])

    model += pulp.lpSum(
        production_cost_terms + holding_cost_terms + transport_cost_terms + emergency_cost_terms
    )

    # Shipment capacity + minimum batch per trip
    for r in routes:
        sbq = float(r.minimum_shipment_batch_quantity)
        for mode in r.modes:
            cap = float(mode.capacity_per_trip)
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                model += q[key] <= trips[key] * cap, f"Cap_{r.id}_{mode.mode}_{t}"
                model += q[key] >= trips[key] * sbq, f"SBQ_{r.id}_{mode.mode}_{t}"

    # Optional production bounds
    for p in plants:
        if p.type != "IU":
            continue
        if p.max_production_per_period is None:
            continue
        for t in range(1, T + 1):
            model += (
                prod[(p.id, t)] <= float(p.max_production_per_period)
            ), f"MaxProd_{p.id}_{t}"

    # Helper expressions for received/shipped per plant-period
    received_expr: Dict[Tuple[str, int], pulp.LpAffineExpression] = {}
    shipped_expr: Dict[Tuple[str, int], pulp.LpAffineExpression] = {}

    for p in plants:
        for t in range(1, T + 1):
            inbound = pulp.lpSum(
                q[(r.id, m.mode, t)]
                for r in routes
                for m in r.modes
                if r.destination_id == p.id
            )
            outbound = pulp.lpSum(
                q[(r.id, m.mode, t)]
                for r in routes
                for m in r.modes
                if r.origin_id == p.id
            )

            if enable_emergency_sourcing:
                inbound = inbound + emergency[(p.id, t)]

            received_expr[(p.id, t)] = inbound
            shipped_expr[(p.id, t)] = outbound

    # Inventory balance: I_t = I_{t-1} + P_t + R_t - S_t - D_t
    for p in plants:
        for t in range(1, T + 1):
            prev_inv = float(p.initial_inventory) if t == 1 else inv[(p.id, t - 1)]
            prod_term = prod[(p.id, t)] if p.type == "IU" else 0
            model += (
                inv[(p.id, t)]
                == prev_inv
                + prod_term
                + received_expr[(p.id, t)]
                - shipped_expr[(p.id, t)]
                - demand[(p.id, t)]
            ), f"InvBal_{p.id}_{t}"

    # Safety stock and capacity
    for p in plants:
        for t in range(1, T + 1):
            model += inv[(p.id, t)] >= float(p.safety_stock), f"Safety_{p.id}_{t}"
            model += inv[(p.id, t)] <= float(p.max_capacity), f"MaxCap_{p.id}_{t}"

    # Solve
    try:
        solver = pulp.PULP_CBC_CMD(msg=False)
        model.solve(solver)
    except Exception as exc:  # pragma: no cover
        return SolveResult(status="Error", total_cost=None, scheduled_trips=[], message=str(exc))

    status = pulp.LpStatus.get(model.status, "Not Solved")

    if status != "Optimal":
        return SolveResult(status=status, total_cost=None, scheduled_trips=[], message=None)

    total_cost = float(pulp.value(model.objective)) if model.objective is not None else None

    # Extract schedule
    route_by_id = {r.id: r for r in routes}
    scheduled_trips: List[ScheduledTrip] = []

    for (route_id, mode_name, t), trips_var in trips.items():
        trips_val = int(round(trips_var.value() or 0))
        qty_val = float(q[(route_id, mode_name, t)].value() or 0.0)
        if trips_val <= 0 and qty_val <= 1e-9:
            continue

        r = route_by_id[route_id]
        scheduled_trips.append(
            ScheduledTrip(
                period=t,
                route_id=route_id,
                origin_id=r.origin_id,
                destination_id=r.destination_id,
                mode=mode_name,
                num_trips=max(0, trips_val),
                quantity_shipped=max(0.0, qty_val),
            )
        )

    scheduled_trips.sort(key=lambda s: (s.period, s.route_id, s.mode))

    return SolveResult(status="Optimal", total_cost=total_cost, scheduled_trips=scheduled_trips)


def solve_with_emergency_fallback(req: OptimizationRequest) -> SolveResult:
    """Solve first without emergency; if infeasible, re-solve with emergency sourcing."""

    base = solve_supply_chain(req, enable_emergency_sourcing=False)
    if base.status == "Optimal":
        return base

    if base.status != "Infeasible":
        return base

    fallback = solve_supply_chain(req, enable_emergency_sourcing=True)
    if fallback.status == "Optimal":
        return SolveResult(
            status="Optimal",
            total_cost=fallback.total_cost,
            scheduled_trips=fallback.scheduled_trips,
            message="Base model infeasible; used high-cost emergency sourcing to produce a feasible plan.",
        )

    return SolveResult(
        status=fallback.status,
        total_cost=fallback.total_cost,
        scheduled_trips=fallback.scheduled_trips,
        message="Base model infeasible and emergency fallback did not solve.",
    )
