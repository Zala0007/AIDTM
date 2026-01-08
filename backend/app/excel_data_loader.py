"""
Excel Data Loader for Uploaded Files
Handles data extraction from uploaded Excel files dynamically.
"""

import pandas as pd
from typing import List, Dict, Any, Optional


def get_data_from_store(data_store: Dict[str, Optional[pd.DataFrame]]) -> Dict[str, Any]:
    """
    Get summary of data from uploaded Excel store.
    Returns total routes, plants, periods from the uploaded data.
    """
    logistics_df = data_store.get("LogisticsIUGU")
    iugu_type_df = data_store.get("IUGUType")
    
    if logistics_df is None or iugu_type_df is None:
        return {
            "success": False,
            "message": "No data uploaded yet. Please upload an Excel file first.",
            "total_routes": 0,
            "total_plants": 0,
            "total_periods": 0,
            "periods": [],
            "sheets_found": []
        }
    
    # Filter out Sea routes (T3)
    logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
    
    total_routes = len(logistics_df)
    periods = sorted(logistics_df['TIME PERIOD'].unique().astype(str).tolist())
    total_periods = len(periods)
    total_plants = len(iugu_type_df)
    
    sheets_found = [name for name, df in data_store.items() if df is not None]
    
    return {
        "success": True,
        "total_routes": total_routes,
        "total_plants": total_plants,
        "total_periods": total_periods,
        "periods": periods,
        "sheets_found": sheets_found
    }


def get_sources_from_store(data_store: Dict[str, Optional[pd.DataFrame]]) -> List[str]:
    """Get source plants (IU codes) from uploaded data, excluding Sea routes."""
    iugu_type_df = data_store.get("IUGUType")
    logistics_df = data_store.get("LogisticsIUGU")
    
    if iugu_type_df is None or logistics_df is None:
        return []
    
    # Filter out Sea routes
    logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
    
    # Get IU codes (sources)
    iu_codes = iugu_type_df[iugu_type_df['PLANT TYPE'] == 'IU']['IUGU CODE'].unique().tolist()
    
    # Filter to only IU codes that exist in logistics
    available_sources = logistics_df['FROM IU CODE'].unique().tolist()
    sources = [code for code in iu_codes if code in available_sources]
    
    return sorted(sources)


def get_destinations_from_store(data_store: Dict[str, Optional[pd.DataFrame]], source: str) -> List[str]:
    """Get destinations for a source from uploaded data, excluding Sea routes."""
    logistics_df = data_store.get("LogisticsIUGU")
    
    if logistics_df is None:
        return []
    
    # Filter out Sea routes
    logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
    
    # Filter by source
    destinations = logistics_df[logistics_df['FROM IU CODE'] == source]['TO IUGU CODE'].unique().tolist()
    
    return sorted(destinations)


def get_transport_modes_from_store(data_store: Dict[str, Optional[pd.DataFrame]], 
                                   source: str, 
                                   destination: str) -> List[Dict[str, Any]]:
    """Get transport modes for a route from uploaded data (Road and Rail only, no Sea)."""
    logistics_df = data_store.get("LogisticsIUGU")
    
    if logistics_df is None:
        return []
    
    # Filter out Sea routes
    logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
    
    # Filter by source and destination
    filtered = logistics_df[
        (logistics_df['FROM IU CODE'] == source) & 
        (logistics_df['TO IUGU CODE'] == destination)
    ]
    
    # Get unique transport codes
    transport_codes = filtered['TRANSPORT CODE'].unique().tolist()
    
    # Map transport codes to names and capacities
    mode_mapping = {
        'T1': {'name': 'Road', 'vehicle_capacity': 25},
        'T2': {'name': 'Rail', 'vehicle_capacity': 3000},
    }
    
    modes = []
    for code in transport_codes:
        if code in mode_mapping:
            modes.append({
                'code': code,
                'name': mode_mapping[code]['name'],
                'vehicle_capacity': mode_mapping[code]['vehicle_capacity']
            })
    
    return modes


def get_periods_from_store(data_store: Dict[str, Optional[pd.DataFrame]]) -> List[str]:
    """Get time periods from uploaded data."""
    logistics_df = data_store.get("LogisticsIUGU")
    
    if logistics_df is None:
        return []
    
    periods = sorted(logistics_df['TIME PERIOD'].unique().astype(str).tolist())
    return periods


def calculate_milp_from_store(data_store: Dict[str, Optional[pd.DataFrame]], 
                              source: str, 
                              destination: str, 
                              mode: str, 
                              period: str) -> Dict[str, Any]:
    """
    Calculate MILP solution using uploaded data.
    Similar to csv_data_loader's calculate_milp_solution but uses uploaded data store.
    """
    try:
        # Load data from store
        logistics_df = data_store.get("LogisticsIUGU")
        capacity_df = data_store.get("ClinkerCapacity")
        demand_df = data_store.get("ClinkerDemand")
        production_cost_df = data_store.get("ProductionCost")
        opening_stock_df = data_store.get("IUGUOpeningStock")
        closing_stock_df = data_store.get("IUGUClosingStock")
        iugu_type_df = data_store.get("IUGUType")
        
        # Check if all required data is available
        if any(df is None for df in [logistics_df, capacity_df, demand_df, production_cost_df, 
                                      opening_stock_df, closing_stock_df, iugu_type_df]):
            return {
                "success": False,
                "message": "Missing required data sheets. Please upload complete Excel file.",
                "feasibility": {"feasible": False, "reason": "Missing data"}
            }
        
        # Convert period to int
        period_int = int(period)
        
        # Filter logistics for the route
        route_data = logistics_df[
            (logistics_df['FROM IU CODE'] == source) &
            (logistics_df['TO IUGU CODE'] == destination) &
            (logistics_df['TRANSPORT CODE'] == mode) &
            (logistics_df['TIME PERIOD'] == period_int)
        ]
        
        if route_data.empty:
            return {
                "success": False,
                "message": f"No data found for route {source} → {destination} via {mode} in period {period}",
                "feasibility": {"feasible": False, "reason": "Route not found in data"}
            }
        
        route_row = route_data.iloc[0]
        
        # Get source capacity
        source_capacity_data = capacity_df[
            (capacity_df['IU CODE'] == source) &
            (capacity_df['TIME PERIOD'] == period_int)
        ]
        source_capacity = float(source_capacity_data.iloc[0]['CAPACITY']) if not source_capacity_data.empty else 0
        
        # Get destination demand
        dest_demand_data = demand_df[
            (demand_df['IUGU CODE'] == destination) &
            (demand_df['TIME PERIOD'] == period_int)
        ]
        dest_demand = float(dest_demand_data.iloc[0]['DEMAND']) if not dest_demand_data.empty else 0
        
        # Get production cost
        prod_cost_data = production_cost_df[
            (production_cost_df['IU CODE'] == source) &
            (production_cost_df['TIME PERIOD'] == period_int)
        ]
        production_cost_per_ton = float(prod_cost_data.iloc[0]['PRODUCTION COST']) if not prod_cost_data.empty else 0
        
        # Get opening stocks
        source_opening_data = opening_stock_df[opening_stock_df['IUGU CODE'] == source]
        source_opening_stock = float(source_opening_data.iloc[0]['OPENING STOCK']) if not source_opening_data.empty else 0
        
        dest_opening_data = opening_stock_df[opening_stock_df['IUGU CODE'] == destination]
        dest_opening_stock = float(dest_opening_data.iloc[0]['OPENING STOCK']) if not dest_opening_data.empty else 0
        
        # Get closing stock requirements
        source_closing_data = closing_stock_df[
            (closing_stock_df['IUGU CODE'] == source) &
            (closing_stock_df['TIME PERIOD'] == period_int)
        ]
        source_min_closing = float(source_closing_data.iloc[0]['MIN CLOSE STOCK']) if not source_closing_data.empty else 0
        source_max_closing = float(source_closing_data.iloc[0]['MAX CLOSE STOCK']) if not source_closing_data.empty else 100000
        
        dest_closing_data = closing_stock_df[
            (closing_stock_df['IUGU CODE'] == destination) &
            (closing_stock_df['TIME PERIOD'] == period_int)
        ]
        dest_min_closing = float(dest_closing_data.iloc[0]['MIN CLOSE STOCK']) if not dest_closing_data.empty else 0
        dest_max_closing = float(dest_closing_data.iloc[0]['MAX CLOSE STOCK']) if not dest_closing_data.empty else float('inf')
        
        # Get plant types
        source_type_data = iugu_type_df[iugu_type_df['IUGU CODE'] == source]
        source_type = source_type_data.iloc[0]['PLANT TYPE'] if not source_type_data.empty else 'Unknown'
        
        dest_type_data = iugu_type_df[iugu_type_df['IUGU CODE'] == destination]
        dest_type = dest_type_data.iloc[0]['PLANT TYPE'] if not dest_type_data.empty else 'Unknown'
        
        # Get freight and handling costs
        freight_cost = float(route_row['FREIGHT COST'])
        handling_cost = float(route_row['HANDLING COST'])
        
        # Vehicle capacity based on mode
        vehicle_capacity = 3000 if mode == 'T2' else 25
        
        # Calculate shipment quantity (min of demand and available capacity)
        shipment_quantity = min(dest_demand, source_capacity)
        
        # Calculate number of trips
        import math
        num_trips = math.ceil(shipment_quantity / vehicle_capacity)
        
        # Calculate production needed
        # P[i,t] = X[i,j,m,t] + I[i,t] - I[i,t-1]
        # Where I[i,t] is closing stock requirement
        production_quantity = shipment_quantity + source_min_closing - source_opening_stock
        production_quantity = max(0, production_quantity)  # Can't be negative
        
        # Calculate ending inventories
        source_ending_inventory = source_opening_stock + production_quantity - shipment_quantity
        dest_ending_inventory = dest_opening_stock + shipment_quantity - dest_demand
        
        # Calculate costs
        total_production_cost = production_cost_per_ton * production_quantity
        total_transport_cost = (freight_cost + handling_cost) * shipment_quantity
        holding_cost_per_ton = production_cost_per_ton * 0.01  # 1% of production cost
        total_holding_cost = holding_cost_per_ton * (source_ending_inventory + dest_ending_inventory)
        
        total_cost = total_production_cost + total_transport_cost + total_holding_cost
        cost_per_ton = total_cost / shipment_quantity if shipment_quantity > 0 else 0
        
        # Build response similar to milp_optimizer.py
        result = {
            "success": True,
            "decision_variables": {
                "P": {
                    "name": "P[i,t]",
                    "value": round(production_quantity, 2),
                    "unit": "tons",
                    "description": f"Production at {source} in period {period}",
                    "formula": f"P[{source},{period}]"
                },
                "X": {
                    "name": "X[i,j,m,t]",
                    "value": round(shipment_quantity, 2),
                    "unit": "tons shipped",
                    "description": f"Shipment from {source} to {destination} via {mode} in period {period}",
                    "formula": f"X[{source},{destination},{mode},{period}]"
                },
                "I_source": {
                    "name": "I[source,t]",
                    "value": round(source_ending_inventory, 2),
                    "unit": "tons inventory",
                    "description": f"Ending inventory at {source}",
                    "formula": f"I[{source},{period}]"
                },
                "I_dest": {
                    "name": "I[dest,t]",
                    "value": round(dest_ending_inventory, 2),
                    "unit": "tons inventory",
                    "description": f"Ending inventory at {destination}",
                    "formula": f"I[{destination},{period}]"
                },
                "T": {
                    "name": "T[i,j,m,t]",
                    "value": num_trips,
                    "unit": "trips (integer)",
                    "description": f"Number of trips from {source} to {destination} via {mode}",
                    "formula": f"T[{source},{destination},{mode},{period}] = ceil({shipment_quantity} / {vehicle_capacity}) = {num_trips}"
                }
            },
            "objective_function": {
                "formula": "Z = Σ(C_prod × P) + Σ(C_fr + C_hand) × X + Σ(C_hold × I)",
                "components": {
                    "production_cost": {
                        "value": round(total_production_cost, 2),
                        "formula": f"{production_cost_per_ton} × {round(production_quantity, 2)} = {round(total_production_cost, 2)}",
                        "description": "Production cost at source"
                    },
                    "transport_cost": {
                        "value": round(total_transport_cost, 2),
                        "formula": f"({freight_cost} + {handling_cost}) × {shipment_quantity} = {round(total_transport_cost, 2)}",
                        "description": "Freight + Handling costs",
                        "breakdown": {
                            "freight": round(freight_cost * shipment_quantity, 2),
                            "handling": round(handling_cost * shipment_quantity, 2)
                        }
                    },
                    "holding_cost": {
                        "value": round(total_holding_cost, 2),
                        "formula": f"{round(holding_cost_per_ton, 4)} × ({round(source_ending_inventory, 2)} + {round(dest_ending_inventory, 2)}) = {round(total_holding_cost, 2)}",
                        "description": "Inventory holding cost"
                    }
                },
                "total_cost": round(total_cost, 2),
                "cost_per_ton": round(cost_per_ton, 2)
            },
            "mass_balance": {
                "source": {
                    "I_0": round(source_opening_stock, 2),
                    "P_t": round(production_quantity, 2),
                    "inbound": 0,
                    "outbound": round(shipment_quantity, 2),
                    "D_t": round(source_capacity - production_quantity - source_opening_stock + shipment_quantity, 2) if source_type == 'IU' else 0,
                    "I_t": round(source_ending_inventory, 2),
                    "equation_string": f"I[{source},{period}] = {round(source_opening_stock, 2)} + {round(production_quantity, 2)} + 0 - {round(shipment_quantity, 2)} - {round(source_capacity - production_quantity - source_opening_stock + shipment_quantity, 2) if source_type == 'IU' else 0} = {round(source_ending_inventory, 2)}"
                },
                "destination": {
                    "I_0": round(dest_opening_stock, 2),
                    "P_t": 0,
                    "inbound": round(shipment_quantity, 2),
                    "outbound": 0,
                    "D_t": round(dest_demand, 2),
                    "I_t": round(dest_ending_inventory, 2),
                    "equation_string": f"I[{destination},{period}] = {round(dest_opening_stock, 2)} + 0 + {round(shipment_quantity, 2)} - 0 - {round(dest_demand, 2)} = {round(dest_ending_inventory, 2)}"
                }
            },
            "constraints": [
                {
                    "name": "Production Capacity",
                    "formula": f"P[{source},{period}] ≤ Cap[{source},{period}]",
                    "lhs": round(production_quantity, 2),
                    "rhs": round(source_capacity, 2),
                    "satisfied": production_quantity <= source_capacity,
                    "slack": round(source_capacity - production_quantity, 2),
                    "utilization_pct": round((production_quantity / source_capacity * 100), 2) if source_capacity > 0 else 0
                },
                {
                    "name": "Shipment Upper Bound",
                    "formula": f"X[{source},{destination},{mode},{period}] ≤ T × Cap_m",
                    "lhs": round(shipment_quantity, 2),
                    "rhs": round(num_trips * vehicle_capacity, 2),
                    "satisfied": shipment_quantity <= num_trips * vehicle_capacity,
                    "vehicle_capacity": vehicle_capacity
                },
                {
                    "name": "Source Inventory Bounds",
                    "formula": f"SS[{source}] ≤ I[{source},{period}] ≤ MaxCap[{source}]",
                    "lhs": round(source_ending_inventory, 2),
                    "rhs": f"{source_min_closing} to {source_max_closing}",
                    "satisfied": source_min_closing <= source_ending_inventory <= source_max_closing,
                    "safety_stock": source_min_closing,
                    "max_capacity": source_max_closing
                },
                {
                    "name": "Destination Inventory Bounds",
                    "formula": f"SS[{destination}] ≤ I[{destination},{period}] ≤ MaxCap[{destination}]",
                    "lhs": round(dest_ending_inventory, 2),
                    "rhs": f"{dest_min_closing} to {'unlimited' if dest_max_closing == float('inf') else dest_max_closing}",
                    "satisfied": dest_ending_inventory >= dest_min_closing,
                    "safety_stock": dest_min_closing,
                    "max_capacity": "unlimited" if dest_max_closing == float('inf') else dest_max_closing
                }
            ],
            "strategic_constraints": {
                "bound": "L",
                "value_type": "C",
                "value": round(source_capacity * 0.6, 2),
                "transport": mode
            },
            "metrics": {
                "capacity_utilization_pct": round((production_quantity / source_capacity * 100), 2) if source_capacity > 0 else 0,
                "demand_fulfillment_pct": round((shipment_quantity / dest_demand * 100), 2) if dest_demand > 0 else 0,
                "inventory_turnover_source": round(shipment_quantity / source_ending_inventory, 2) if source_ending_inventory > 0 else 0,
                "inventory_turnover_dest": round(dest_demand / dest_ending_inventory, 2) if dest_ending_inventory > 0 else 0,
                "transport_efficiency": 100.0,
                "days_of_supply_dest": round(dest_ending_inventory / (dest_demand / 30), 2) if dest_demand > 0 else 0,
                "cost_breakdown_pct": {
                    "production": round((total_production_cost / total_cost * 100), 2) if total_cost > 0 else 0,
                    "transport": round((total_transport_cost / total_cost * 100), 2) if total_cost > 0 else 0,
                    "holding": round((total_holding_cost / total_cost * 100), 2) if total_cost > 0 else 0
                }
            },
            "raw_data": {
                "source_type": source_type,
                "destination_type": dest_type,
                "freight_cost_per_ton": f"{round(freight_cost, 2)} ₹/ton",
                "handling_cost_per_ton": f"{round(handling_cost, 2)} ₹/ton",
                "production_cost_per_ton": f"{round(production_cost_per_ton, 2)} ₹/ton",
                "source_capacity_tons": f"{round(source_capacity, 2)} tons",
                "destination_demand_tons": f"{round(dest_demand, 2)} tons",
                "total_logistics_per_ton": f"{round(freight_cost + handling_cost, 2)} ₹/ton"
            },
            "feasibility": {
                "feasible": all([
                    production_quantity <= source_capacity,
                    shipment_quantity <= num_trips * vehicle_capacity,
                    source_min_closing <= source_ending_inventory <= source_max_closing,
                    dest_ending_inventory >= dest_min_closing
                ]),
                "reason": "All constraints satisfied" if all([
                    production_quantity <= source_capacity,
                    shipment_quantity <= num_trips * vehicle_capacity,
                    source_min_closing <= source_ending_inventory <= source_max_closing,
                    dest_ending_inventory >= dest_min_closing
                ]) else "Some constraints violated"
            }
        }
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error calculating MILP solution: {str(e)}",
            "feasibility": {"feasible": False, "reason": str(e)}
        }
