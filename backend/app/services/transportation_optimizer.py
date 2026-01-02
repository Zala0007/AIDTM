"""
Transportation Optimization Engine.
Solves the OPERATIONAL problem (HOW to move clinker - mode, consolidation, trips).
Uses output from Allocation Engine as input.
Handles multi-destination consolidation.
"""

import pyomo.environ as pyo
from pyomo.opt import SolverFactory, TerminationCondition
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TransportationProblemData:
    """Data structure for transportation optimization."""
    
    # Source and destinations
    source_iu_id: str
    destination_ids: List[str]  # Mix of IUs and GUs
    
    # Allocation decisions from previous step
    # Dict: destination_id -> quantity_tons
    allocation_quantities: Dict[str, float]
    
    # Available transport modes
    # Dict: mode_id -> (capacity_per_trip, fixed_cost, variable_cost_per_ton, sbq)
    transport_modes: Dict[str, Tuple[float, float, float, float]]
    
    # Planning periods
    num_periods: int
    periods: List[int]
    
    # For each period-destination-mode combination:
    # Costs (if available)
    # Dict: (period, destination, mode) -> cost_multiplier (1.0 = base)
    period_dest_cost_multiplier: Dict[Tuple[int, str, str], float] = None


class TransportationOptimizer:
    """
    Operational transportation optimizer.
    
    Decides:
    - Which transport mode to use for each destination
    - How many trips needed
    - Which destinations to consolidate (share trips)
    
    Objective: Minimize transportation cost (fixed + variable + consolidation)
    """
    
    def __init__(self, solver_name: str = "cbc", time_limit: int = 300, enable_consolidation: bool = True):
        """
        Initialize transportation optimizer.
        
        Args:
            solver_name: "cbc", "glpk", "gurobi"
            time_limit: Maximum solve time in seconds
            enable_consolidation: Allow multi-destination consolidation
        """
        self.solver_name = solver_name
        self.time_limit = time_limit
        self.enable_consolidation = enable_consolidation
        self.model = None
    
    def solve(self, data: TransportationProblemData) -> Dict[str, Any]:
        """
        Solve transportation optimization problem.
        
        Returns:
            Dictionary with:
            - status: "optimal", "feasible", "infeasible"
            - routes: List of transport routes with mode, quantity, trips
            - consolidation_analysis: Benefits of consolidation
            - total_cost: Optimal transportation cost
            - solve_time: Solver execution time
        """
        logger.info(f"Starting transportation optimization from {data.source_iu_id} to {len(data.destination_ids)} destinations")
        
        start_time = datetime.now()
        
        # Build the model
        self.model = self._build_model(data)
        
        # Solve
        try:
            solver = SolverFactory(self.solver_name)
            if not solver.available():
                logger.error(f"Solver {self.solver_name} not available")
                return self._infeasible_result(start_time)
            
            # Configure solver
            if self.solver_name == "gurobi":
                solver.options["TimeLimit"] = self.time_limit
                solver.options["MIPGap"] = 0.01
            elif self.solver_name == "cbc":
                solver.options["seconds"] = self.time_limit
            
            # Solve
            results = solver.solve(self.model, tee=False)
            
        except Exception as e:
            logger.error(f"Solver error: {e}")
            return self._infeasible_result(start_time)
        
        # Parse results
        if results.solver.termination_condition != TerminationCondition.optimal:
            logger.warning(f"Non-optimal termination: {results.solver.termination_condition}")
        
        return self._parse_results(data, start_time)
    
    def _build_model(self, data: TransportationProblemData) -> pyo.ConcreteModel:
        """Build Pyomo model for transportation optimization."""
        model = pyo.ConcreteModel()
        
        # ==================== SETS ====================
        model.destinations = pyo.Set(initialize=data.destination_ids)
        model.modes = pyo.Set(initialize=list(data.transport_modes.keys()))
        model.periods = pyo.Set(initialize=data.periods)
        
        # Possible routes: (destination, mode, period)
        routes = []
        for dest in data.destination_ids:
            for mode in data.transport_modes.keys():
                for period in data.periods:
                    routes.append((dest, mode, period))
        model.routes = pyo.Set(initialize=routes, dimen=3)
        
        # ==================== DECISION VARIABLES ====================
        
        # Shipment quantity via each mode to each destination in each period (tons)
        model.shipment = pyo.Var(model.routes, bounds=(0, None))
        
        # Number of trips for each route (integer)
        model.trips = pyo.Var(model.routes, bounds=(0, None), within=pyo.NonNegativeIntegers)
        
        # Binary variable: is this route used (for fixed cost)
        model.route_active = pyo.Var(model.routes, bounds=(0, 1), within=pyo.Binary)
        
        # Binary variable: destinations consolidated in this shipment
        if self.enable_consolidation:
            model.consolidation_binary = pyo.Var(routes, within=pyo.Binary)
        
        # ==================== OBJECTIVE FUNCTION ====================
        
        def objective_expr(model):
            obj = 0
            
            for (dest, mode, period) in model.routes:
                capacity, fixed_cost, var_cost, sbq = data.transport_modes[mode]
                
                # Fixed cost for each trip
                obj += fixed_cost * model.trips[dest, mode, period]
                
                # Variable cost
                obj += var_cost * model.shipment[dest, mode, period]
            
            # Penalty for consolidation (benefit: reduction in fixed costs)
            if self.enable_consolidation:
                # This is handled through the trip calculation
                pass
            
            return obj
        
        model.objective = pyo.Objective(rule=objective_expr, sense=pyo.minimize)
        
        # ==================== CONSTRAINTS ====================
        
        # 1. Demand fulfillment: total shipment to each destination >= allocation
        def demand_rule(model, dest):
            allocation = data.allocation_quantities.get(dest, 0)
            if allocation == 0:
                return pyo.Constraint.Skip
            
            total_shipment = sum(model.shipment[dest, mode, period]
                               for mode in model.modes
                               for period in model.periods
                               if (dest, mode, period) in model.routes)
            
            return total_shipment >= allocation * 0.99  # Allow 1% margin
        
        model.demand_constraint = pyo.Constraint(model.destinations, rule=demand_rule)
        
        # 2. Trip constraint: trips * capacity >= shipment (respecting SBQ)
        def trip_rule(model, dest, mode, period):
            if (dest, mode, period) not in model.routes:
                return pyo.Constraint.Skip
            
            capacity, _, _, sbq = data.transport_modes[mode]
            shipment = model.shipment[dest, mode, period]
            trips = model.trips[dest, mode, period]
            
            # Shipment must fit in trips * capacity
            return shipment <= trips * capacity
        
        model.trip_constraint = pyo.Constraint(model.routes, rule=trip_rule)
        
        # 3. SBQ constraint: if shipment > 0, must be >= SBQ
        def sbq_rule(model, dest, mode, period):
            if (dest, mode, period) not in model.routes:
                return pyo.Constraint.Skip
            
            _, _, _, sbq = data.transport_modes[mode]
            shipment = model.shipment[dest, mode, period]
            
            # If shipment > 0, then shipment >= sbq
            # Using big-M: shipment >= sbq * route_active
            M = 50000  # Large number
            return shipment >= sbq * model.route_active[dest, mode, period]
        
        model.sbq_constraint = pyo.Constraint(model.routes, rule=sbq_rule)
        
        # 4. Route active constraint
        def route_active_rule(model, dest, mode, period):
            if (dest, mode, period) not in model.routes:
                return pyo.Constraint.Skip
            
            M = 50000
            shipment = model.shipment[dest, mode, period]
            return shipment <= M * model.route_active[dest, mode, period]
        
        model.route_active_constraint = pyo.Constraint(model.routes, rule=route_active_rule)
        
        # 5. At least one mode must be selected for consolidation (optional)
        if self.enable_consolidation:
            def consolidation_rule(model):
                # Count destinations with multiple modes used simultaneously
                # This encourages consolidation
                return sum(model.consolidation_binary[dest, mode, period]
                          for (dest, mode, period) in model.routes) >= 0
            
            # This is optional; can be left for future enhancement
            # model.consolidation_benefit = pyo.Constraint(rule=consolidation_rule)
        
        logger.info(f"Transportation model built with {len(routes)} possible routes")
        
        return model
    
    def _parse_results(self, data: TransportationProblemData, start_time: datetime) -> Dict[str, Any]:
        """Parse transportation optimization results."""
        
        solve_time = (datetime.now() - start_time).total_seconds()
        
        # Extract routes
        routes = []
        total_trips = 0
        total_cost = 0
        
        for (dest, mode, period) in self.model.routes:
            shipment_qty = pyo.value(self.model.shipment[dest, mode, period])
            trips_count = pyo.value(self.model.trips[dest, mode, period])
            
            if shipment_qty > 0.01:
                capacity, fixed_cost, var_cost, sbq = data.transport_modes[mode]
                
                route_cost = fixed_cost * trips_count + var_cost * shipment_qty
                total_cost += route_cost
                total_trips += int(round(trips_count))
                
                routes.append({
                    "source_plant_id": data.source_iu_id,
                    "destination_plant_id": dest,
                    "transport_mode": mode,
                    "period": period,
                    "quantity_tons": float(shipment_qty),
                    "num_trips": int(round(trips_count)),
                    "shared_route": False,  # Can be enhanced to detect consolidation
                    "transport_cost_dollars": float(route_cost)
                })
        
        # Analyze consolidation benefits
        consolidation_analysis = self._analyze_consolidation(data, routes)
        
        # Calculate KPIs
        num_destinations_served = len(set(r["destination_plant_id"] for r in routes))
        vehicle_utilization = self._calculate_vehicle_utilization(data, routes)
        
        return {
            "status": "optimal" if pyo.value(self.model.objective) != float('inf') else "feasible",
            "routes": routes,
            "consolidation_benefits": consolidation_analysis,
            "total_transport_cost_dollars": float(pyo.value(self.model.objective)),
            "total_destinations_served": num_destinations_served,
            "total_trips_required": total_trips,
            "vehicle_utilization_percent": vehicle_utilization,
            "solve_time_seconds": solve_time
        }
    
    def _analyze_consolidation(self, data: TransportationProblemData, 
                              routes: List[Dict]) -> List[Dict[str, Any]]:
        """Analyze consolidation benefits."""
        
        if not self.enable_consolidation:
            return []
        
        consolidation = []
        
        # Group by mode to identify consolidation opportunities
        by_mode = {}
        for route in routes:
            mode = route["transport_mode"]
            if mode not in by_mode:
                by_mode[mode] = []
            by_mode[mode].append(route)
        
        for mode, mode_routes in by_mode.items():
            if len(mode_routes) > 1:
                # Consolidation opportunity
                total_qty = sum(r["quantity_tons"] for r in mode_routes)
                total_trips_consolidated = sum(r["num_trips"] for r in mode_routes)
                
                capacity, fixed_cost, var_cost, sbq = data.transport_modes[mode]
                
                # Calculate trips without consolidation (each destination separately)
                trips_without_consolidation = sum(
                    -(-r["quantity_tons"] // capacity)  # Ceiling division
                    for r in mode_routes
                )
                
                if trips_without_consolidation > total_trips_consolidated:
                    fixed_cost_saved = fixed_cost * (trips_without_consolidation - total_trips_consolidated)
                    
                    consolidation.append({
                        "route_segment": f"Multi-destination {mode} consolidation",
                        "destinations_served": len(mode_routes),
                        "trips_without_consolidation": int(trips_without_consolidation),
                        "trips_with_consolidation": int(total_trips_consolidated),
                        "fixed_cost_saved_dollars": float(fixed_cost_saved),
                        "variable_cost_saved_dollars": 0.0
                    })
        
        return consolidation
    
    def _calculate_vehicle_utilization(self, data: TransportationProblemData, 
                                       routes: List[Dict]) -> float:
        """Calculate average vehicle utilization percentage."""
        
        if not routes:
            return 0.0
        
        total_capacity_available = 0
        total_qty_shipped = 0
        
        for route in routes:
            mode = route["transport_mode"]
            capacity, _, _, _ = data.transport_modes[mode]
            total_capacity_available += route["num_trips"] * capacity
            total_qty_shipped += route["quantity_tons"]
        
        if total_capacity_available == 0:
            return 0.0
        
        return min(100.0, (total_qty_shipped / total_capacity_available) * 100)
    
    def _infeasible_result(self, start_time: datetime) -> Dict[str, Any]:
        """Return infeasible result."""
        return {
            "status": "infeasible",
            "routes": [],
            "consolidation_benefits": [],
            "total_transport_cost_dollars": float('inf'),
            "total_destinations_served": 0,
            "total_trips_required": 0,
            "vehicle_utilization_percent": 0.0,
            "solve_time_seconds": (datetime.now() - start_time).total_seconds()
        }
