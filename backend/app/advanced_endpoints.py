"""
Enhanced API endpoints for multi-CSV upload and advanced optimization
"""
from __future__ import annotations

import io
import csv
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
import pandas as pd

from .schemas import (
    IUGUTypeRow,
    IUGUOpeningStockRow,
    IUGUClosingStockRow,
    ProductionCostRow,
    ClinkerCapacityRow,
    ClinkerDemandRow,
    LogisticsIUGURow,
    IUGUConstraintRow,
    OptimizationInput,
    OptimizationRequest,
    OptimizationResponse,
    ConstraintRow,
    Plant,
    TransportationRoute,
    RouteMode,
)
from .advanced_optimizer import solve_clinker_transport_advanced, EnhancedSolveResult
from .data_generator import ClinkerDataGenerator, generate_training_datasets
from .logger import logger

router = APIRouter(prefix="/api/v2", tags=["advanced"])


@router.post("/upload-dataset")
async def upload_complete_dataset(
    iugu_type: Optional[UploadFile] = File(None),
    opening_stock: Optional[UploadFile] = File(None),
    closing_stock: Optional[UploadFile] = File(None),
    production_cost: Optional[UploadFile] = File(None),
    clinker_capacity: Optional[UploadFile] = File(None),
    clinker_demand: Optional[UploadFile] = File(None),
    logistics: Optional[UploadFile] = File(None),
    constraints: Optional[UploadFile] = File(None),
) -> Dict:
    """
    Upload complete dataset with all 8 CSV types.
    Validates and stores for optimization.
    
    Returns parsed and validated data structure.
    """
    
    try:
        result = OptimizationInput()
        
        # Parse each CSV if provided
        if iugu_type:
            content = await iugu_type.read()
            df = pd.read_csv(io.BytesIO(content))
            result.iugu_type = [IUGUTypeRow(**row) for row in df.to_dict(orient="records")]
        
        if opening_stock:
            content = await opening_stock.read()
            df = pd.read_csv(io.BytesIO(content))
            result.iugu_opening_stock = [IUGUOpeningStockRow(**row) for row in df.to_dict(orient="records")]
        
        if closing_stock:
            content = await closing_stock.read()
            df = pd.read_csv(io.BytesIO(content))
            result.iugu_closing_stock = [IUGUClosingStockRow(**row) for row in df.to_dict(orient="records")]
        
        if production_cost:
            content = await production_cost.read()
            df = pd.read_csv(io.BytesIO(content))
            result.production_cost = [ProductionCostRow(**row) for row in df.to_dict(orient="records")]
        
        if clinker_capacity:
            content = await clinker_capacity.read()
            df = pd.read_csv(io.BytesIO(content))
            result.clinker_capacity = [ClinkerCapacityRow(**row) for row in df.to_dict(orient="records")]
        
        if clinker_demand:
            content = await clinker_demand.read()
            df = pd.read_csv(io.BytesIO(content))
            result.clinker_demand = [ClinkerDemandRow(**row) for row in df.to_dict(orient="records")]
        
        if logistics:
            content = await logistics.read()
            df = pd.read_csv(io.BytesIO(content))
            result.logistics_iugu = [LogisticsIUGURow(**row) for row in df.to_dict(orient="records")]
        
        if constraints:
            content = await constraints.read()
            df = pd.read_csv(io.BytesIO(content))
            result.iugu_constraints = [IUGUConstraintRow(**row) for row in df.to_dict(orient="records")]
        
        # Generate summary statistics
        stats = {
            "num_ius": len([r for r in result.iugu_type if r.plant_type == "IU"]),
            "num_gus": len([r for r in result.iugu_type if r.plant_type == "GU"]),
            "num_periods": len(set(r.time_period for r in result.clinker_demand)) if result.clinker_demand else 0,
            "num_routes": len(result.logistics_iugu),
            "num_constraints": len(result.iugu_constraints),
            "total_capacity": sum(r.capacity for r in result.clinker_capacity),
            "total_demand": sum(r.demand for r in result.clinker_demand),
        }
        
        return {
            "success": True,
            "message": "Dataset uploaded and validated successfully",
            "stats": stats,
            "data": result.model_dump(),
        }
    
    except Exception as e:
        logger.error(f"Dataset upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process dataset: {str(e)}"
        )


@router.post("/optimize-full")
async def optimize_with_full_dataset(
    iugu_type: UploadFile = File(...),
    opening_stock: UploadFile = File(...),
    closing_stock: UploadFile = File(...),
    production_cost: UploadFile = File(...),
    clinker_capacity: UploadFile = File(...),
    clinker_demand: UploadFile = File(...),
    logistics: UploadFile = File(...),
    constraints: Optional[UploadFile] = File(None),
    T: int = Form(4),
    enable_diagnostics: bool = Form(True),
    solver_timeout: int = Form(300),
) -> Dict:
    """
    Complete optimization with full CSV dataset upload.
    
    This endpoint:
    1. Accepts all 8 CSV types
    2. Constructs the optimization model
    3. Solves with advanced MILP optimizer
    4. Returns detailed results with diagnostics
    """
    
    try:
        # Parse all CSVs
        logger.info("Parsing uploaded CSV files...")
        
        # 1. IUGU Type
        content = await iugu_type.read()
        df_type = pd.read_csv(io.BytesIO(content))
        type_rows = [IUGUTypeRow(**row) for row in df_type.to_dict(orient="records")]
        
        # 2. Opening Stock
        content = await opening_stock.read()
        df_opening = pd.read_csv(io.BytesIO(content))
        opening_rows = [IUGUOpeningStockRow(**row) for row in df_opening.to_dict(orient="records")]
        
        # 3. Closing Stock
        content = await closing_stock.read()
        df_closing = pd.read_csv(io.BytesIO(content))
        closing_rows = [IUGUClosingStockRow(**row) for row in df_closing.to_dict(orient="records")]
        
        # 4. Production Cost
        content = await production_cost.read()
        df_prod_cost = pd.read_csv(io.BytesIO(content))
        prod_cost_rows = [ProductionCostRow(**row) for row in df_prod_cost.to_dict(orient="records")]
        
        # 5. Clinker Capacity
        content = await clinker_capacity.read()
        df_capacity = pd.read_csv(io.BytesIO(content))
        capacity_rows = [ClinkerCapacityRow(**row) for row in df_capacity.to_dict(orient="records")]
        
        # 6. Clinker Demand
        content = await clinker_demand.read()
        df_demand = pd.read_csv(io.BytesIO(content))
        demand_rows = [ClinkerDemandRow(**row) for row in df_demand.to_dict(orient="records")]
        
        # 7. Logistics
        content = await logistics.read()
        df_logistics = pd.read_csv(io.BytesIO(content))
        logistics_rows = [LogisticsIUGURow(**row) for row in df_logistics.to_dict(orient="records")]
        
        # 8. Constraints (optional)
        constraint_rows = []
        if constraints:
            content = await constraints.read()
            df_constraints = pd.read_csv(io.BytesIO(content))
            constraint_rows = [IUGUConstraintRow(**row) for row in df_constraints.to_dict(orient="records")]
        
        logger.info("Building optimization model from CSVs...")
        
        # Build optimization request from CSVs
        opt_request = _build_optimization_request_from_csvs(
            type_rows=type_rows,
            opening_rows=opening_rows,
            closing_rows=closing_rows,
            prod_cost_rows=prod_cost_rows,
            capacity_rows=capacity_rows,
            demand_rows=demand_rows,
            logistics_rows=logistics_rows,
            T=T,
        )
        
        # Convert constraint rows to ConstraintRow format
        constraint_objs = []
        for c in constraint_rows:
            constraint_objs.append(
                ConstraintRow(
                    iu_code=c.iu_code,
                    transport_code=c.transport_code,
                    iugu_code=c.iugu_code,
                    time_period=c.time_period,
                    bound_type=c.bound_typeid,
                    value_type=c.value_typeid,
                    value=c.value,
                )
            )
        
        logger.info(f"Solving optimization with {len(opt_request.plants)} plants, "
                   f"{len(opt_request.routes)} routes, {T} periods...")
        
        # Solve with advanced optimizer
        result = solve_clinker_transport_advanced(
            req=opt_request,
            constraint_rows=constraint_objs if constraint_objs else None,
            enable_diagnostics=enable_diagnostics,
            solver_timeout=solver_timeout,
        )
        
        logger.info(f"Optimization complete: {result.status}")
        
        return {
            "success": result.status == "Optimal",
            "status": result.status,
            "total_cost": result.total_cost,
            "cost_breakdown": {
                "production": result.production_cost,
                "transport": result.transport_cost,
                "holding": result.holding_cost,
            },
            "summary": {
                "total_production": result.total_production,
                "total_transport": result.total_transport,
                "avg_inventory_utilization": result.avg_inventory_utilization,
                "num_active_routes": result.num_active_routes,
            },
            "scheduled_trips": [trip.model_dump() for trip in result.scheduled_trips],
            "plant_metrics": result.plant_metrics,
            "period_metrics": result.period_metrics,
            "solver_time": result.solver_time,
            "message": result.message,
        }
    
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(e)}"
        )


@router.post("/generate-dataset")
async def generate_synthetic_dataset(
    num_ius: int = Form(15),
    num_gus: int = Form(30),
    num_periods: int = Form(12),
    scenario: str = Form("balanced"),
    seed: Optional[int] = Form(None),
    save_to_disk: bool = Form(False),
) -> Dict:
    """
    Generate synthetic clinker supply chain dataset.
    
    Scenarios:
    - balanced: Normal operations with balanced supply/demand
    - high_demand: High demand scenario with capacity pressure
    - capacity_constrained: Limited production capacity
    - strategic: Complex strategic constraints
    
    Returns generated datasets as JSON or saves to disk.
    """
    
    try:
        logger.info(f"Generating {scenario} dataset: {num_ius} IUs, {num_gus} GUs, {num_periods} periods")
        
        generator = ClinkerDataGenerator(seed=seed)
        datasets = generator.generate_complete_dataset(
            num_ius=num_ius,
            num_gus=num_gus,
            num_periods=num_periods,
            scenario=scenario,
        )
        
        if save_to_disk:
            output_dir = f"generated_data/{scenario}_{num_ius}IU_{num_gus}GU"
            files = generator.save_datasets_to_csv(datasets, output_dir)
            
            return {
                "success": True,
                "message": "Dataset generated and saved to disk",
                "files": files,
                "scenario": scenario,
                "params": {
                    "num_ius": num_ius,
                    "num_gus": num_gus,
                    "num_periods": num_periods,
                },
            }
        else:
            # Return as JSON
            result = {}
            for name, df in datasets.items():
                result[name] = df.to_dict(orient="records")
            
            return {
                "success": True,
                "message": "Dataset generated successfully",
                "scenario": scenario,
                "params": {
                    "num_ius": num_ius,
                    "num_gus": num_gus,
                    "num_periods": num_periods,
                },
                "datasets": result,
            }
    
    except Exception as e:
        logger.error(f"Dataset generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dataset generation failed: {str(e)}"
        )


@router.post("/generate-training-datasets")
async def generate_training_data(
    num_scenarios: int = Form(10),
    seed: Optional[int] = Form(None),
) -> Dict:
    """
    Generate multiple training datasets with varied scenarios.
    Useful for model training and testing.
    """
    
    try:
        logger.info(f"Generating {num_scenarios} training scenarios...")
        
        output_dir = "training_data"
        result = generate_training_datasets(
            output_dir=output_dir,
            num_scenarios=num_scenarios,
            seed=seed,
        )
        
        return {
            "success": True,
            "message": f"Generated {num_scenarios} training scenarios",
            "output_dir": output_dir,
            "scenarios": result,
        }
    
    except Exception as e:
        logger.error(f"Training data generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training data generation failed: {str(e)}"
        )


def _build_optimization_request_from_csvs(
    type_rows: List[IUGUTypeRow],
    opening_rows: List[IUGUOpeningStockRow],
    closing_rows: List[IUGUClosingStockRow],
    prod_cost_rows: List[ProductionCostRow],
    capacity_rows: List[ClinkerCapacityRow],
    demand_rows: List[ClinkerDemandRow],
    logistics_rows: List[LogisticsIUGURow],
    T: int,
) -> OptimizationRequest:
    """
    Convert CSV rows into OptimizationRequest model.
    Implements the complete data mapping logic.
    """
    
    # Build node type mapping
    node_types = {row.iugu_code: row.plant_type for row in type_rows}
    
    # Build opening stock mapping
    opening_stock = {row.iugu_code: row.opening_stock for row in opening_rows}
    
    # Build closing stock mapping (min/max by node and period)
    closing_stock = {}
    for row in closing_rows:
        key = (row.iugu_code, row.time_period)
        closing_stock[key] = {
            "min": row.min_close_stock,
            "max": row.max_close_stock or row.min_close_stock * 2,
        }
    
    # Build production cost mapping
    prod_costs = {}
    for row in prod_cost_rows:
        key = (row.iu_code, row.time_period)
        prod_costs[key] = row.production_cost
    
    # Build capacity mapping
    capacities = {}
    for row in capacity_rows:
        key = (row.iu_code, row.time_period)
        capacities[key] = row.capacity
    
    # Build demand mapping
    demands_by_node = {}
    for row in demand_rows:
        if row.iugu_code not in demands_by_node:
            demands_by_node[row.iugu_code] = {}
        demands_by_node[row.iugu_code][row.time_period] = row.demand
    
    # Build plants
    plants = []
    all_nodes = set(node_types.keys())
    
    for node_id in all_nodes:
        node_type = node_types[node_id]
        initial_inv = opening_stock.get(node_id, 0.0)
        
        # Get min/max capacity from closing stock (use period 1 as baseline)
        safety = closing_stock.get((node_id, 1), {}).get("min", initial_inv * 0.2)
        max_cap = closing_stock.get((node_id, 1), {}).get("max", initial_inv * 2)
        
        # Average production cost for IUs
        avg_prod_cost = 0.0
        if node_type == "IU":
            costs = [prod_costs.get((node_id, t), 0.0) for t in range(1, T + 1)]
            avg_prod_cost = sum(costs) / len(costs) if costs else 0.0
        
        # Average capacity for IUs
        max_prod = None
        if node_type == "IU":
            caps = [capacities.get((node_id, t), 0.0) for t in range(1, T + 1)]
            max_prod = sum(caps) / len(caps) if caps else None
        
        plant = Plant(
            id=node_id,
            name=node_id,
            type=node_type,
            initial_inventory=max(0, initial_inv),
            max_capacity=max(max_cap, initial_inv, safety, 1.0),
            safety_stock=max(0, safety),
            holding_cost=5.0,  # Default holding cost
            production_cost=max(0, avg_prod_cost),
            max_production_per_period=max_prod if max_prod and max_prod > 0 else None,
        )
        plants.append(plant)
    
    # Build routes from logistics
    routes_dict = {}
    
    for row in logistics_rows:
        route_key = (row.from_iu_code, row.to_iugu_code)
        
        if route_key not in routes_dict:
            routes_dict[route_key] = {
                "id": f"{row.from_iu_code}->{row.to_iugu_code}",
                "origin_id": row.from_iu_code,
                "destination_id": row.to_iugu_code,
                "minimum_shipment_batch_quantity": 0.0,
                "modes": {},
            }
        
        mode = row.transport_code
        if mode not in routes_dict[route_key]["modes"]:
            routes_dict[route_key]["modes"][mode] = {
                "mode": mode,
                "unit_cost": row.freight_cost + row.handling_cost,
                "capacity_per_trip": row.quantity_multiplier,
            }
    
    # Convert to TransportationRoute objects
    routes = []
    for route_data in routes_dict.values():
        modes = [RouteMode(**m) for m in route_data["modes"].values()]
        route = TransportationRoute(
            id=route_data["id"],
            origin_id=route_data["origin_id"],
            destination_id=route_data["destination_id"],
            minimum_shipment_batch_quantity=route_data["minimum_shipment_batch_quantity"],
            modes=modes,
        )
        routes.append(route)
    
    # Build demand dictionary
    demand_dict = {}
    for node_id in all_nodes:
        if node_id in demands_by_node:
            demand_series = []
            for t in range(1, T + 1):
                demand_series.append(demands_by_node[node_id].get(t, 0.0))
            demand_dict[node_id] = demand_series
        else:
            demand_dict[node_id] = [0.0] * T
    
    return OptimizationRequest(
        T=T,
        plants=plants,
        routes=routes,
        demand=demand_dict,
    )
