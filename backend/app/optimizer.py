from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import pulp

from .schemas import ConstraintRow, OptimizationRequest, ScheduledTrip


@dataclass
class SolveResult:
    status: str
    total_cost: Optional[float]
    scheduled_trips: List[ScheduledTrip]
    message: Optional[str] = None


def solve_clinker_transport(
    req: OptimizationRequest,
    constraint_rows: Optional[List[ConstraintRow]] = None,
) -> SolveResult:
    """Solve the multi-period clinker transportation problem.

    Math model (MILP):

    Indices:
      p in Plants
      r in Routes
      m in Modes(r)
      t in {1..T}

    Decision variables:
      prod[p,t]           >= 0  (only for IUs)
      inv[p,t]            >= 0
      q[r,m,t]            >= 0  (quantity shipped on route r via mode m)
      trips[r,m,t]        integer >= 0

    Objective:
      minimize  sum_{t,p} prod_cost[p]*prod[p,t]
              + sum_{t,r,m} unit_cost[r,m]*q[r,m,t]
              + sum_{t,p} hold_cost[p]*inv[p,t]

    Key constraints:
      q[r,m,t] <= trips[r,m,t] * cap[r,m]
      q[r,m,t] >= trips[r,m,t] * sbq[r]   (enforces minimum avg shipment per trip)

    Inventory balance (for each plant p and period t):
      inv[p,t] = inv[p,t-1] + prod[p,t] + received[p,t] - shipped[p,t] - demand[p,t]

    Operational bounds:
      safety_stock[p] <= inv[p,t] <= max_capacity[p]

    Notes:
      - Demand defaults to 0 if not provided for a plant.
      - This is a planning model; it does not explicitly model per-trip loading,
        only aggregates via q and trips with SBQ/Capacity constraints.
    """

    T = req.T
    plants = req.plants
    routes = req.routes

    plants_by_id = {p.id: p for p in plants}

    demand: Dict[Tuple[str, int], float] = {}
    for plant_id in plants_by_id:
        series = req.demand.get(plant_id, [0.0] * T)
        for t in range(1, T + 1):
            demand[(plant_id, t)] = float(series[t - 1])

    # Build the optimization model
    model = pulp.LpProblem("clinker_transport_multi_period", pulp.LpMinimize)

    # Variables
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

    # Shipped quantity and number of trips per route-mode-period
    q = {}
    trips = {}
    for r in routes:
        for mode in r.modes:
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                q[key] = pulp.LpVariable(f"Q_{r.id}_{mode.mode}_{t}", lowBound=0, cat=pulp.LpContinuous)
                trips[key] = pulp.LpVariable(
                    f"Trips_{r.id}_{mode.mode}_{t}", lowBound=0, cat=pulp.LpInteger
                )

    # Objective terms
    production_cost_term = []
    for p in plants:
        if p.type != "IU":
            continue
        for t in range(1, T + 1):
            production_cost_term.append(p.production_cost * prod[(p.id, t)])

    transport_cost_term = []
    for r in routes:
        for mode in r.modes:
            for t in range(1, T + 1):
                transport_cost_term.append(mode.unit_cost * q[(r.id, mode.mode, t)])

    holding_cost_term = []
    for p in plants:
        for t in range(1, T + 1):
            holding_cost_term.append(p.holding_cost * inv[(p.id, t)])

    model += pulp.lpSum(production_cost_term + transport_cost_term + holding_cost_term)

    # Constraints

    # 1) Shipment capacity + SBQ link
    for r in routes:
        sbq = float(r.minimum_shipment_batch_quantity)
        for mode in r.modes:
            cap = float(mode.capacity_per_trip)
            for t in range(1, T + 1):
                key = (r.id, mode.mode, t)
                model += q[key] <= trips[key] * cap
                # If SBQ==0, this constraint is harmless.
                model += q[key] >= trips[key] * sbq

    # 2) Production upper bounds (optional)
    for p in plants:
        if p.type != "IU":
            continue
        if p.max_production_per_period is None:
            continue
        for t in range(1, T + 1):
            model += (
                prod[(p.id, t)] <= float(p.max_production_per_period)
            ), f"MaxProd_{p.id}_{t}"

    # Helper: received/shipped expressions
    received_expr: Dict[Tuple[str, int], pulp.LpAffineExpression] = {}
    shipped_expr: Dict[Tuple[str, int], pulp.LpAffineExpression] = {}
    for p in plants:
        for t in range(1, T + 1):
            received_expr[(p.id, t)] = pulp.lpSum(
                q[(r.id, m.mode, t)]
                for r in routes
                for m in r.modes
                if r.destination_id == p.id
            )
            shipped_expr[(p.id, t)] = pulp.lpSum(
                q[(r.id, m.mode, t)]
                for r in routes
                for m in r.modes
                if r.origin_id == p.id
            )

    # 3) Inventory balance
    for p in plants:
        for t in range(1, T + 1):
            prev_inv = p.initial_inventory if t == 1 else inv[(p.id, t - 1)]
            prod_term = prod[(p.id, t)] if p.type == "IU" else 0
            model += (
                inv[(p.id, t)]
                == prev_inv
                + prod_term
                + received_expr[(p.id, t)]
                - shipped_expr[(p.id, t)]
                - demand[(p.id, t)]
            ), f"InvBal_{p.id}_{t}"

    # 4) Safety stock and max capacity bounds
    for p in plants:
        for t in range(1, T + 1):
            model += inv[(p.id, t)] >= float(p.safety_stock), f"Safety_{p.id}_{t}"
            model += inv[(p.id, t)] <= float(p.max_capacity), f"MaxCap_{p.id}_{t}"

    # Apply dynamic IU/GU constraints if provided
    if constraint_rows:
        _apply_dynamic_constraints(model, constraint_rows, routes, q, T)

    # Solve
    try:
        # CBC is included with PuLP wheels on many platforms.
        solver = pulp.PULP_CBC_CMD(msg=False)
        model.solve(solver)
    except Exception as exc:  # pragma: no cover
        return SolveResult(status="Error", total_cost=None, scheduled_trips=[], message=str(exc))

    pulp_status = pulp.LpStatus.get(model.status, "Not Solved")

    if pulp_status != "Optimal":
        return SolveResult(status=pulp_status, total_cost=None, scheduled_trips=[], message=None)

    total_cost = float(pulp.value(model.objective)) if model.objective is not None else None

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

    return SolveResult(status="Optimal", total_cost=total_cost, scheduled_trips=schedule)


def _apply_dynamic_constraints(
    model: pulp.LpProblem,
    rows: List[ConstraintRow],
    routes: List,
    q: Dict[Tuple[str, str, int], pulp.LpVariable],
    T: int,
) -> None:
    """Apply IU/mode/route limits from IUGUConstraint.csv semantics.

    Cases:
      - Global IU (no transport_code, no iugu_code): sum_{j,m} X[i,j,m,t]
      - Mode-specific (transport_code set, iugu_code empty): sum_{j} X[i,j,m,t]
      - Route-specific (both set): X[i,j,m,t] (optionally filtered by mode)
    Bound types: L(>=), U(<=), E(=)
    """

    # Precompute route lookup by origin/destination
    # Allow multiple routes per origin/dest; include all matching
    route_list = list(routes)

    def _matching_vars(iu: str, dst: Optional[str], mode_code: Optional[str], t: int):
        target_mode = mode_code.lower() if mode_code else None
        matches = []
        for r in route_list:
            if r.origin_id != iu:
                continue
            if dst and r.destination_id != dst:
                continue
            for m in r.modes:
                if target_mode and m.mode.lower() != target_mode:
                    continue
                key = (r.id, m.mode, t)
                if key in q:
                    matches.append(q[key])
        return matches

    for idx, row in enumerate(rows):
        t = row.time_period
        if t < 1 or t > T:
            continue

        iu = row.iu_code
        mode_code = row.transport_code
        dst = row.iugu_code

        if not dst and not mode_code:
            vars_for_row = _matching_vars(iu, None, None, t)
        elif not dst and mode_code:
            vars_for_row = _matching_vars(iu, None, mode_code, t)
        else:
            vars_for_row = _matching_vars(iu, dst, mode_code, t)

        if not vars_for_row:
            continue

        expr = pulp.lpSum(vars_for_row)
        cname = f"DynConstr_{iu}_{mode_code or 'all'}_{dst or 'all'}_{t}_{idx}"

        if row.bound_type == 'L':
            model += expr >= row.value, cname
        elif row.bound_type == 'U':
            model += expr <= row.value, cname
        else:  # 'E'
            model += expr == row.value, cname
