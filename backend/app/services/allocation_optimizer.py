"""
Allocation Optimization Engine.
Solves the strategic ALLOCATION problem (What to produce, Where to store, When).
Separate from Transportation layer.
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
class AllocationProblemData:
    """Data structure for allocation optimization."""
    
    # Plants involved
    ius: List[str]  # Integrated Units (producers)
    gus: List[str]  # Grinding Units (consumers)
    
    # Time periods
    num_periods: int
    periods: List[int]
    
    # Demand (tons per period)
    # Dict: plant_id -> {period -> demand}
    demands: Dict[str, Dict[int, float]]
    
    # Production capacity (tons) and cost ($/ton) at IUs
    # Dict: iu_id -> {period -> (capacity, variable_cost)}
    production_capacity: Dict[str, Dict[int, Tuple[float, float]]]
    
    # Initial inventory (tons)
    # Dict: plant_id -> initial_inventory
    initial_inventory: Dict[str, float]
    
    # Safety stock (tons)
    # Dict: plant_id -> safety_stock
    safety_stock: Dict[str, float]
    
    # Max storage capacity (tons)
    # Dict: plant_id -> max_capacity
    max_inventory: Dict[str, float]
    
    # Transportation cost between plants ($/ton)
    # Dict: (origin, destination) -> cost
    transport_cost: Dict[Tuple[str, str], float]


class AllocationOptimizer:
    """
    Strategic allocation optimizer for clinker supply chain.
    
    Decides:
    - How much each IU should produce each period
    - How much clinker each IU should send to each GU/IU each period
    - Inventory levels to maintain at each plant
    
    Objective: Minimize total cost (production + inventory holding + allocation transport)
    """
    
    def __init__(self, solver_name: str = "cbc", time_limit: int = 300):
        """
        Initialize optimizer.
        
        Args:
            solver_name: "cbc", "glpk", "gurobi"
            time_limit: Maximum solve time in seconds
        """
        self.solver_name = solver_name
        self.time_limit = time_limit
        self.model = None
        self.results = None
    
    def solve(self, data: AllocationProblemData) -> Dict[str, Any]:
        """
        Solve allocation optimization problem.
        
        Returns:
            Dictionary with:
            - status: "optimal", "feasible", "infeasible"
            - production_plan: List of (iu_id, period, quantity, cost)
            - shipments: List of (origin, destination, period, quantity)
            - inventory: List of (plant_id, period, level)
            - total_cost: Optimal cost value
            - solve_time: Solver execution time
        """
        logger.info(f"Starting allocation optimization with {len(data.ius)} IUs, {len(data.gus)} GUs, {data.num_periods} periods")
        
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
    
    def _build_model(self, data: AllocationProblemData) -> pyo.ConcreteModel:
        """Build Pyomo concrete model."""
        model = pyo.ConcreteModel()
        
        # ==================== SETS ====================
        model.plants = pyo.Set(initialize=data.ius + data.gus)
        model.ius = pyo.Set(initialize=data.ius)
        model.gus = pyo.Set(initialize=data.gus)
        model.periods = pyo.Set(initialize=data.periods)
        
        # Possible allocation routes (IU -> IU or IU -> GU)
        allocation_routes = []
        for origin in data.ius:
            for destination in data.ius + data.gus:
                if origin != destination:
                    allocation_routes.append((origin, destination))
        model.routes = pyo.Set(initialize=allocation_routes, dimen=2)
        
        # ==================== DECISION VARIABLES ====================
        
        # Production at each IU in each period (tons)
        model.production = pyo.Var(model.ius, model.periods, bounds=(0, None))
        
        # Shipment from origin to destination in each period (tons)
        model.shipment = pyo.Var(model.routes, model.periods, bounds=(0, None))
        
        # Inventory at each plant at end of each period (tons)
        model.inventory = pyo.Var(model.plants, model.periods, bounds=(0, None))
        
        # ==================== OBJECTIVE FUNCTION ====================
        
        def objective_expr(model):
            obj = 0
            
            # Production cost
            for iu in model.ius:
                for t in model.periods:
                    capacity, var_cost = data.production_capacity.get(iu, {}).get(t, (0, 0))
                    if var_cost > 0:
                        obj += var_cost * model.production[iu, t]
            
            # Inventory holding cost (assume $1/ton/period)
            for plant in model.plants:
                for t in model.periods:
                    obj += 1.0 * model.inventory[plant, t]
            
            # Allocation transport cost
            for (origin, dest) in model.routes:
                for t in model.periods:
                    cost = data.transport_cost.get((origin, dest), 2.0)  # Default $2/ton
                    obj += cost * model.shipment[origin, dest, t]
            
            return obj
        
        model.objective = pyo.Objective(rule=objective_expr, sense=pyo.minimize)
        
        # ==================== CONSTRAINTS ====================
        
        # 1. Production capacity constraints
        def production_capacity_rule(model, iu, t):
            capacity, _ = data.production_capacity.get(iu, {}).get(t, (float('inf'), 0))
            return model.production[iu, t] <= capacity
        model.production_capacity_constraint = pyo.Constraint(
            model.ius, model.periods, rule=production_capacity_rule
        )
        
        # 2. Inventory balance constraints
        def inventory_balance_rule(model, plant, t):
            # Inventory[t] = Inventory[t-1] + Production[t] + Inbound[t] - Demand[t] - Outbound[t]
            
            # Initial inventory
            prev_inventory = data.initial_inventory.get(plant, 0)
            if t > 1:
                prev_inventory = model.inventory[plant, t-1]
            
            # Production (if IU)
            production = 0
            if plant in model.ius:
                production = model.production[plant, t]
            
            # Inbound shipments
            inbound = sum(model.shipment[origin, plant, t] 
                         for origin in model.ius + model.gus 
                         if origin != plant and (origin, plant) in model.routes)
            
            # Demand
            demand = data.demands.get(plant, {}).get(t, 0)
            
            # Outbound shipments
            outbound = sum(model.shipment[plant, dest, t]
                          for dest in model.ius + model.gus
                          if dest != plant and (plant, dest) in model.routes)
            
            return model.inventory[plant, t] == prev_inventory + production + inbound - demand - outbound
        
        model.inventory_balance = pyo.Constraint(
            model.plants, model.periods, rule=inventory_balance_rule
        )
        
        # 3. Safety stock constraints
        def safety_stock_rule(model, plant, t):
            ss = data.safety_stock.get(plant, 0)
            return model.inventory[plant, t] >= ss
        model.safety_stock_constraint = pyo.Constraint(
            model.plants, model.periods, rule=safety_stock_rule
        )
        
        # 4. Max inventory constraints
        def max_inventory_rule(model, plant, t):
            max_cap = data.max_inventory.get(plant, float('inf'))
            return model.inventory[plant, t] <= max_cap
        model.max_inventory_constraint = pyo.Constraint(
            model.plants, model.periods, rule=max_inventory_rule
        )
        
        # 5. Demand fulfillment (GUs must receive demand)
        def demand_fulfillment_rule(model, gu, t):
            demand = data.demands.get(gu, {}).get(t, 0)
            if demand == 0:
                return pyo.Constraint.Skip
            
            # Total inbound must meet demand
            inbound = sum(model.shipment[origin, gu, t]
                         for origin in model.ius
                         if (origin, gu) in model.routes)
            
            return inbound >= demand
        model.demand_fulfillment = pyo.Constraint(
            model.gus, model.periods, rule=demand_fulfillment_rule
        )
        
        logger.info(f"Model built: {len(list(model.component_objects(pyo.Var)))} variables, "
                   f"{len(list(model.component_objects(pyo.Constraint)))} constraints")
        
        return model
    
    def _parse_results(self, data: AllocationProblemData, start_time: datetime) -> Dict[str, Any]:
        """Parse optimization results."""
        
        solve_time = (datetime.now() - start_time).total_seconds()
        
        # Extract production plan
        production_plan = []
        for iu in data.ius:
            for t in data.periods:
                qty = pyo.value(self.model.production[iu, t])
                if qty > 0.01:
                    capacity, var_cost = data.production_capacity.get(iu, {}).get(t, (0, 0))
                    production_plan.append({
                        "iu_id": iu,
                        "period": t,
                        "quantity_tons": float(qty),
                        "cost_dollars": float(qty * var_cost)
                    })
        
        # Extract shipments (allocations)
        shipments = []
        for (origin, dest) in self.model.routes:
            for t in data.periods:
                qty = pyo.value(self.model.shipment[origin, dest, t])
                if qty > 0.01:
                    cost = data.transport_cost.get((origin, dest), 2.0)
                    shipments.append({
                        "from_plant_id": origin,
                        "to_plant_id": dest,
                        "period": t,
                        "quantity_tons": float(qty),
                        "cost_dollars": float(qty * cost)
                    })
        
        # Extract inventory
        inventory = []
        for plant in data.ius + data.gus:
            for t in data.periods:
                level = pyo.value(self.model.inventory[plant, t])
                ss = data.safety_stock.get(plant, 0)
                max_cap = data.max_inventory.get(plant, float('inf'))
                inventory.append({
                    "plant_id": plant,
                    "period": t,
                    "level_tons": float(level),
                    "safety_stock_tons": float(ss),
                    "max_capacity_tons": float(max_cap),
                    "holding_cost_dollars": float(level * 1.0)  # $1/ton/period
                })
        
        # Calculate total cost
        total_cost = float(pyo.value(self.model.objective))
        
        # Production cost
        production_cost = sum(p["cost_dollars"] for p in production_plan)
        
        # Transport cost
        transport_cost = sum(s["cost_dollars"] for s in shipments)
        
        # Holding cost
        holding_cost = sum(inv["holding_cost_dollars"] for inv in inventory)
        
        return {
            "status": "optimal" if pyo.value(self.model.objective) != float('inf') else "feasible",
            "production_plan": production_plan,
            "shipments": shipments,
            "inventory": inventory,
            "total_cost_dollars": total_cost,
            "cost_breakdown": {
                "production_cost_dollars": production_cost,
                "transport_cost_dollars": transport_cost,
                "holding_cost_dollars": holding_cost,
                "total_cost_dollars": total_cost
            },
            "solve_time_seconds": solve_time,
            "model_stats": {
                "num_variables": len(list(self.model.component_objects(pyo.Var))),
                "num_constraints": len(list(self.model.component_objects(pyo.Constraint)))
            }
        }
    
    def _infeasible_result(self, start_time: datetime) -> Dict[str, Any]:
        """Return infeasible result."""
        return {
            "status": "infeasible",
            "production_plan": [],
            "shipments": [],
            "inventory": [],
            "total_cost_dollars": float('inf'),
            "cost_breakdown": {
                "production_cost_dollars": 0,
                "transport_cost_dollars": 0,
                "holding_cost_dollars": 0,
                "total_cost_dollars": 0
            },
            "solve_time_seconds": (datetime.now() - start_time).total_seconds(),
            "model_stats": {}
        }
