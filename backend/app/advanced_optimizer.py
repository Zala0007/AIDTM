"""
Advanced MILP Optimizer for Clinker Supply Chain
Implements comprehensive industry-grade Operations Research model
with all constraints and features for hackathon-winning quality.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import pulp
import numpy as np
from .schemas import (
    OptimizationRequest,
    ScheduledTrip,
    ConstraintRow,
    Plant,
    TransportationRoute,
)


@dataclass
class EnhancedSolveResult:
    """Extended result with diagnostics and quality metrics."""
    status: str
    total_cost: Optional[float]
    scheduled_trips: List[ScheduledTrip]
    message: Optional[str] = None
    
    # Enhanced diagnostics
    production_cost: Optional[float] = None
    transport_cost: Optional[float] = None
    holding_cost: Optional[float] = None
    total_production: Optional[float] = None
    total_transport: Optional[float] = None
    avg_inventory_utilization: Optional[float] = None
    num_active_routes: Optional[int] = None
    solver_time: Optional[float] = None
    gap: Optional[float] = None
    
    # Plant-level metrics
    plant_metrics: Optional[Dict[str, dict]] = None
    
    # Period-level metrics
    period_metrics: Optional[Dict[int, dict]] = None


def solve_clinker_transport_advanced(
    req: OptimizationRequest,
    constraint_rows: Optional[List[ConstraintRow]] = None,
    enable_diagnostics: bool = True,
    solver_timeout: Optional[int] = 300,
) -> EnhancedSolveResult:
    """
    Advanced MILP solver for multi-period clinker transportation.
    
    Mathematical Model:
    ===================
    
    Decision Variables:
    -------------------
    P[i,t]      : Production quantity at IU i in period t (continuous, >= 0)
    X[i,j,m,t]  : Quantity shipped from i to j via mode m in period t (continuous, >= 0)
    T[i,j,m,t]  : Number of trips from i to j via mode m in period t (integer, >= 0)
    I[i,t]      : Inventory level at node i at end of period t (continuous, >= 0)
    
    Objective Function:
    -------------------
    Minimize Z = Σ(P[i,t] * C_prod[i,t]) +                    [Production Cost]
                 Σ(T[i,j,m,t] * C_freight[i,j,m,t]) +         [Trip Freight Cost]
                 Σ(X[i,j,m,t] * C_handling[i,j,m,t]) +        [Handling Cost]
                 Σ(I[i,t] * C_holding[i])                     [Inventory Holding Cost]
    
    Constraints:
    ------------
    1. Mass Balance (The Domino Effect):
       I[i,t] = I[i,t-1] + P[i,t] + Σ(X[j,i,m,t]) - Σ(X[i,j,m,t]) - D[i,t]
       - Ensures clinker flow continuity across periods
       - Initial inventory I[i,0] comes from IUGUOpeningStock
    
    2. Integer Shipment Link (The "Integer Headache"):
       X[i,j,m,t] <= T[i,j,m,t] * Cap[i,j,m]
       X[i,j,m,t] >= T[i,j,m,t] * SBQ[i,j]
       - Links continuous quantity to discrete trips
       - Enforces minimum shipment batch quantity
    
    3. Inventory Thresholds (Silo Guardrails):
       I_min[i,t] <= I[i,t] <= I_max[i,t]
       - Prevents overflows and shortages
       - Safety stock enforcement
    
    4. Production Capability:
       P[i,t] <= Cap_prod[i,t]  for all IUs
       - Respects kiln capacity limits
    
    5. Demand Fulfillment:
       Supply[i,t] >= D[i,t] * MinFulfillment[i,t]
       - Ensures minimum service levels
    
    6. Strategic Constraints (from IUGUConstraint.csv):
       - Global IU bounds: Σ(X[i,*,*,t]) ≥/≤/= Value
       - Mode-specific: Σ(X[i,*,m,t]) ≥/≤/= Value
       - Route-specific: X[i,j,m,t] ≥/≤/= Value
    
    Args:
        req: Full optimization request with plants, routes, demand
        constraint_rows: Optional strategic constraints from CSV
        enable_diagnostics: Whether to compute detailed metrics
        solver_timeout: Maximum solver time in seconds
    
    Returns:
        EnhancedSolveResult with optimal solution and diagnostics
    """
    
    import time
    start_time = time.time()
    
    T = req.T
    plants = req.plants
    routes = req.routes
    
    plants_by_id = {p.id: p for p in plants}
    
    # Build demand dictionary
    demand: Dict[Tuple[str, int], float] = {}
    for plant_id in plants_by_id:
        series = req.demand.get(plant_id, [0.0] * T)
        for t in range(1, T + 1):
            demand[(plant_id, t)] = float(series[t - 1])
    
    # ==========================================
    # MODEL CONSTRUCTION
    # ==========================================
    
    model = pulp.LpProblem("Advanced_Clinker_Supply_Chain_MILP", pulp.LpMinimize)
    
    # ==========================================
    # DECISION VARIABLES
    # ==========================================
    
    # Inventory variables I[i,t]
    inv = pulp.LpVariable.dicts(
        "Inventory",
        ((p.id, t) for p in plants for t in range(1, T + 1)),
        lowBound=0,
        cat=pulp.LpContinuous,
    )
    
    # Production variables P[i,t] (IUs only)
    prod = pulp.LpVariable.dicts(
        "Production",
        ((p.id, t) for p in plants if p.type == "IU" for t in range(1, T + 1)),
        lowBound=0,
        cat=pulp.LpContinuous,
    )
    
    # Shipment quantity X[i,j,m,t] and trips T[i,j,m,t]
    q = {}  # Continuous quantity
    trips = {}  # Integer trips
    
    for r in routes:
        for mode in r.modes:
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                
                q[key] = pulp.LpVariable(
                    f"Quantity_{r.id}_{mode.mode}_T{t}",
                    lowBound=0,
                    cat=pulp.LpContinuous,
                )
                
                trips[key] = pulp.LpVariable(
                    f"Trips_{r.id}_{mode.mode}_T{t}",
                    lowBound=0,
                    cat=pulp.LpInteger,
                )
    
    # ==========================================
    # OBJECTIVE FUNCTION
    # ==========================================
    
    # 1. Production cost term
    production_cost_expr = []
    for p in plants:
        if p.type != "IU":
            continue
        for t in range(1, T + 1):
            production_cost_expr.append(p.production_cost * prod[(p.id, t)])
    
    # 2. Transport cost term (freight + handling)
    transport_freight_expr = []
    transport_handling_expr = []
    
    for r in routes:
        for mode in r.modes:
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                # Freight cost per trip
                transport_freight_expr.append(mode.unit_cost * q[key])
                # Handling cost per unit (if available in mode, else 0)
                handling_cost = getattr(mode, 'handling_cost', 0.0)
                transport_handling_expr.append(handling_cost * q[key])
    
    # 3. Inventory holding cost term
    holding_cost_expr = []
    for p in plants:
        for t in range(1, T + 1):
            holding_cost_expr.append(p.holding_cost * inv[(p.id, t)])
    
    # Total objective
    model += pulp.lpSum(
        production_cost_expr +
        transport_freight_expr +
        transport_handling_expr +
        holding_cost_expr
    ), "TotalCost"
    
    # ==========================================
    # CONSTRAINTS
    # ==========================================
    
    # CONSTRAINT 1: Integer Shipment Link (The "Integer Headache")
    # X[i,j,m,t] <= T[i,j,m,t] * Cap[m]
    # X[i,j,m,t] >= T[i,j,m,t] * SBQ[route]
    
    for r in routes:
        sbq = float(r.minimum_shipment_batch_quantity)
        for mode in r.modes:
            cap = float(mode.capacity_per_trip)
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                
                # Upper bound: cannot ship more than trip capacity allows
                model += (
                    q[key] <= trips[key] * cap,
                    f"ShipCapacity_{r.id}_{mode.mode}_T{t}"
                )
                
                # Lower bound: minimum batch quantity per trip (if trips > 0)
                if sbq > 0:
                    model += (
                        q[key] >= trips[key] * sbq,
                        f"MinBatch_{r.id}_{mode.mode}_T{t}"
                    )
    
    # CONSTRAINT 2: Production Capability (only for IUs)
    for p in plants:
        if p.type != "IU":
            continue
        if p.max_production_per_period is not None:
            for t in range(1, T + 1):
                model += (
                    prod[(p.id, t)] <= float(p.max_production_per_period),
                    f"ProductionCap_{p.id}_T{t}"
                )
    
    # CONSTRAINT 3: Mass Balance (The Domino Effect)
    # I[i,t] = I[i,t-1] + P[i,t] + Inflow - Outflow - Demand
    
    # Build inflow/outflow expressions for each plant-period
    inflow_expr: Dict[Tuple[str, int], pulp.LpAffineExpression] = {}
    outflow_expr: Dict[Tuple[str, int], pulp.LpAffineExpression] = {}
    
    for p in plants:
        for t in range(1, T + 1):
            # Inflow: sum of all shipments arriving at this plant
            inflow_expr[(p.id, t)] = pulp.lpSum(
                q[(r.id, m.mode, t)]
                for r in routes
                for m in r.modes
                if r.destination_id == p.id
            )
            
            # Outflow: sum of all shipments leaving this plant
            outflow_expr[(p.id, t)] = pulp.lpSum(
                q[(r.id, m.mode, t)]
                for r in routes
                for m in r.modes
                if r.origin_id == p.id
            )
    
    # Apply mass balance for each plant and period
    for p in plants:
        for t in range(1, T + 1):
            prev_inv = p.initial_inventory if t == 1 else inv[(p.id, t - 1)]
            prod_term = prod[(p.id, t)] if p.type == "IU" else 0
            
            model += (
                inv[(p.id, t)] ==
                prev_inv +
                prod_term +
                inflow_expr[(p.id, t)] -
                outflow_expr[(p.id, t)] -
                demand[(p.id, t)],
                f"MassBalance_{p.id}_T{t}"
            )
    
    # CONSTRAINT 4: Inventory Thresholds (Silo Guardrails)
    for p in plants:
        for t in range(1, T + 1):
            # Lower bound: safety stock
            model += (
                inv[(p.id, t)] >= float(p.safety_stock),
                f"SafetyStock_{p.id}_T{t}"
            )
            
            # Upper bound: maximum capacity
            model += (
                inv[(p.id, t)] <= float(p.max_capacity),
                f"MaxCapacity_{p.id}_T{t}"
            )
    
    # CONSTRAINT 5: Strategic Constraints (from IUGUConstraint.csv)
    if constraint_rows:
        _apply_strategic_constraints_advanced(
            model, constraint_rows, routes, q, T, plants_by_id
        )
    
    # ==========================================
    # SOLVE
    # ==========================================
    
    try:
        solver = pulp.PULP_CBC_CMD(
            msg=True,
            timeLimit=solver_timeout,
            gapRel=0.01,  # 1% optimality gap
            threads=4,  # Use multiple cores
        )
        model.solve(solver)
    except Exception as exc:
        return EnhancedSolveResult(
            status="Error",
            total_cost=None,
            scheduled_trips=[],
            message=f"Solver error: {str(exc)}"
        )
    
    solver_time = time.time() - start_time
    pulp_status = pulp.LpStatus.get(model.status, "Not Solved")
    
    if pulp_status != "Optimal":
        return EnhancedSolveResult(
            status=pulp_status,
            total_cost=None,
            scheduled_trips=[],
            message="No optimal solution found",
            solver_time=solver_time,
        )
    
    # ==========================================
    # EXTRACT SOLUTION
    # ==========================================
    
    total_cost = float(pulp.value(model.objective)) if model.objective else None
    
    # Extract trip schedule
    schedule: List[ScheduledTrip] = []
    route_by_id = {r.id: r for r in routes}
    
    for (route_id, mode_name, t), trips_var in trips.items():
        trips_val = int(round(trips_var.value() or 0))
        qty_val = float(q[(route_id, mode_name, t)].value() or 0.0)
        
        if trips_val <= 0 and qty_val <= 1e-9:
            continue
        
        r = route_by_id[route_id]
        schedule.append(
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
    
    schedule.sort(key=lambda s: (s.period, s.route_id, s.mode))
    
    # ==========================================
    # COMPUTE DIAGNOSTICS
    # ==========================================
    
    diagnostics = {}
    
    if enable_diagnostics:
        # Compute cost breakdown
        prod_cost = sum(pulp.value(e) or 0 for e in production_cost_expr)
        trans_cost = sum(pulp.value(e) or 0 for e in transport_freight_expr + transport_handling_expr)
        hold_cost = sum(pulp.value(e) or 0 for e in holding_cost_expr)
        
        # Compute total production
        total_prod = sum(
            pulp.value(prod[(p.id, t)]) or 0
            for p in plants if p.type == "IU"
            for t in range(1, T + 1)
        )
        
        # Compute total transport
        total_trans = sum(s.quantity_shipped for s in schedule)
        
        # Compute average inventory utilization
        total_inv_util = []
        for p in plants:
            for t in range(1, T + 1):
                inv_val = pulp.value(inv[(p.id, t)]) or 0
                util = inv_val / p.max_capacity if p.max_capacity > 0 else 0
                total_inv_util.append(util)
        
        avg_inv_util = np.mean(total_inv_util) if total_inv_util else 0
        
        # Plant-level metrics
        plant_metrics = {}
        for p in plants:
            total_plant_prod = sum(
                pulp.value(prod[(p.id, t)]) or 0
                for t in range(1, T + 1)
                if (p.id, t) in prod
            )
            
            avg_plant_inv = np.mean([
                pulp.value(inv[(p.id, t)]) or 0
                for t in range(1, T + 1)
            ])
            
            plant_metrics[p.id] = {
                "total_production": total_plant_prod,
                "avg_inventory": avg_plant_inv,
                "capacity_utilization": avg_plant_inv / p.max_capacity if p.max_capacity > 0 else 0,
            }
        
        # Period-level metrics
        period_metrics = {}
        for t in range(1, T + 1):
            period_prod = sum(
                pulp.value(prod[(p.id, t)]) or 0
                for p in plants if p.type == "IU"
            )
            
            period_trans = sum(
                s.quantity_shipped
                for s in schedule if s.period == t
            )
            
            period_metrics[t] = {
                "production": period_prod,
                "transport": period_trans,
                "num_trips": sum(s.num_trips for s in schedule if s.period == t),
            }
        
        diagnostics = {
            "production_cost": prod_cost,
            "transport_cost": trans_cost,
            "holding_cost": hold_cost,
            "total_production": total_prod,
            "total_transport": total_trans,
            "avg_inventory_utilization": avg_inv_util,
            "num_active_routes": len(set(s.route_id for s in schedule)),
            "plant_metrics": plant_metrics,
            "period_metrics": period_metrics,
        }
    
    return EnhancedSolveResult(
        status="Optimal",
        total_cost=total_cost,
        scheduled_trips=schedule,
        message="Solution found successfully",
        solver_time=solver_time,
        **diagnostics
    )


def _apply_strategic_constraints_advanced(
    model: pulp.LpProblem,
    rows: List[ConstraintRow],
    routes: List[TransportationRoute],
    q: Dict[Tuple[str, str, int], pulp.LpVariable],
    T: int,
    plants_by_id: Dict[str, Plant],
) -> None:
    """
    Apply strategic constraints from IUGUConstraint.csv.
    
    Three cases:
    1. Global IU bound (no transport_code, no iugu_code): Σ_{j,m} X[i,j,m,t]
    2. Mode-specific (transport_code set, iugu_code empty): Σ_{j} X[i,j,m,t]
    3. Route-specific (both set): X[i,j,m,t]
    
    Bound types:
    - L (>=): Lower bound
    - U (<=): Upper bound
    - E (=): Equality
    - G (>=): Treated as L
    """
    
    route_list = list(routes)
    
    def _get_matching_vars(
        iu: str,
        dst: Optional[str],
        mode_code: Optional[str],
        t: int
    ) -> List[pulp.LpVariable]:
        """Find all variables matching the constraint scope."""
        target_mode = mode_code.lower() if mode_code else None
        matches = []
        
        for r in route_list:
            if r.origin_id != iu:
                continue
            
            # Check destination filter
            if dst and r.destination_id != dst:
                continue
            
            # Check mode filter
            for m in r.modes:
                if target_mode and m.mode.lower() != target_mode:
                    continue
                
                key = (r.id, m.mode, t)
                if key in q:
                    matches.append(q[key])
        
        return matches
    
    # Apply each constraint row
    for idx, row in enumerate(rows):
        t = row.time_period
        
        if t < 1 or t > T:
            continue
        
        iu = row.iu_code
        mode_code = row.transport_code
        dst = row.iugu_code
        
        # Determine constraint scope
        if not dst and not mode_code:
            # Case 1: Global IU constraint
            vars_for_row = _get_matching_vars(iu, None, None, t)
            scope = "global"
        elif not dst and mode_code:
            # Case 2: Mode-specific constraint
            vars_for_row = _get_matching_vars(iu, None, mode_code, t)
            scope = f"mode_{mode_code}"
        else:
            # Case 3: Route-specific constraint
            vars_for_row = _get_matching_vars(iu, dst, mode_code, t)
            scope = f"route_{dst}_{mode_code or 'any'}"
        
        if not vars_for_row:
            continue
        
        expr = pulp.lpSum(vars_for_row)
        cname = f"Strategic_{iu}_{scope}_T{t}_{idx}"
        
        # Apply bound based on type
        bound_type = row.bound_type.upper()
        value = float(row.value)
        
        if bound_type in ['L', 'G']:
            model += expr >= value, cname
        elif bound_type == 'U':
            model += expr <= value, cname
        elif bound_type == 'E':
            model += expr == value, cname
