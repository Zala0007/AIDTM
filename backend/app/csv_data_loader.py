"""
CSV Data Loader for Advanced Optimization
Reads and processes CSV files from real_data folder
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any
import sys

# Path to CSV files
try:
    REAL_DATA_PATH = Path(__file__).parent.parent.parent / "real_data"
    if not REAL_DATA_PATH.exists():
        print(f"Warning: real_data path not found: {REAL_DATA_PATH}")
        REAL_DATA_PATH = Path("e:/adani/real_data")
except Exception as e:
    print(f"Error setting REAL_DATA_PATH: {e}")
    REAL_DATA_PATH = Path("e:/adani/real_data")


def load_iugu_types() -> pd.DataFrame:
    """Load IUGU plant types."""
    file_path = REAL_DATA_PATH / "IUGUType.csv"
    return pd.read_csv(file_path)


def load_logistics() -> pd.DataFrame:
    """Load logistics/transport data."""
    file_path = REAL_DATA_PATH / "LogisticsIUGU.csv"
    return pd.read_csv(file_path)


def load_demand() -> pd.DataFrame:
    """Load demand data."""
    file_path = REAL_DATA_PATH / "ClinkerDemand.csv"
    return pd.read_csv(file_path)


def load_capacity() -> pd.DataFrame:
    """Load capacity data."""
    file_path = REAL_DATA_PATH / "ClinkerCapacity.csv"
    return pd.read_csv(file_path)


def load_production_cost() -> pd.DataFrame:
    """Load production cost data."""
    file_path = REAL_DATA_PATH / "ProductionCost.csv"
    return pd.read_csv(file_path)


def load_opening_stock() -> pd.DataFrame:
    """Load opening stock data."""
    file_path = REAL_DATA_PATH / "IUGUOpeningStock.csv"
    return pd.read_csv(file_path)


def load_closing_stock() -> pd.DataFrame:
    """Load closing stock data with min/max columns."""
    file_path = REAL_DATA_PATH / "IUGUClosingStock.csv"
    df = pd.read_csv(file_path)
    # Use MIN CLOSE STOCK as the primary closing stock requirement
    if 'MIN CLOSE STOCK' in df.columns:
        df['CLOSING STOCK'] = df['MIN CLOSE STOCK']
    return df


def get_data_summary() -> Dict[str, Any]:
    """Get summary statistics from all CSV files."""
    try:
        # Load data
        logistics_df = load_logistics()
        iugu_df = load_iugu_types()
        demand_df = load_demand()
        
        # Filter out Sea routes (T3)
        logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
        
        # Get unique sources (IU codes)
        sources = logistics_df['FROM IU CODE'].unique()
        iu_sources = [s for s in sources if s.startswith('IU_')]
        
        # Get unique destinations (all IUGU codes)
        all_plants = set(logistics_df['FROM IU CODE'].unique()) | set(logistics_df['TO IUGU CODE'].unique())
        
        # Get unique periods
        periods = sorted(logistics_df['TIME PERIOD'].unique())
        
        # Calculate total routes (excluding T3/Sea)
        total_routes = len(logistics_df.drop_duplicates(subset=['FROM IU CODE', 'TO IUGU CODE', 'TRANSPORT CODE']))
        
        return {
            "success": True,
            "sheets_found": [
                "IUGUType",
                "LogisticsIUGU", 
                "ClinkerCapacity",
                "ClinkerDemand",
                "ProductionCost",
                "IUGUOpeningStock",
                "IUGUClosingStock"
            ],
            "total_routes": total_routes,
            "total_plants": len(all_plants),
            "total_periods": len(periods),
            "periods": [str(p) for p in periods],
            "message": "CSV data loaded successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to load CSV data: {str(e)}"
        }


def get_sources() -> List[str]:
    """Get list of source plants (IU codes only)."""
    try:
        logistics_df = load_logistics()
        # Filter out T3 (Sea)
        logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
        sources = logistics_df['FROM IU CODE'].unique()
        # Only return IU codes as sources
        iu_sources = sorted([s for s in sources if s.startswith('IU_')])
        return iu_sources
    except Exception as e:
        print(f"Error loading sources: {e}")
        return []


def get_destinations(source: str) -> List[str]:
    """Get list of destinations for a given source."""
    try:
        logistics_df = load_logistics()
        # Filter out T3 (Sea)
        logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
        # Filter by source
        filtered = logistics_df[logistics_df['FROM IU CODE'] == source]
        destinations = sorted(filtered['TO IUGU CODE'].unique())
        return destinations
    except Exception as e:
        print(f"Error loading destinations: {e}")
        return []


def get_transport_modes(source: str, destination: str) -> List[Dict[str, Any]]:
    """Get available transport modes for a route."""
    try:
        logistics_df = load_logistics()
        # Filter out T3 (Sea)
        logistics_df = logistics_df[logistics_df['TRANSPORT CODE'] != 'T3']
        # Filter by source and destination
        filtered = logistics_df[
            (logistics_df['FROM IU CODE'] == source) & 
            (logistics_df['TO IUGU CODE'] == destination)
        ]
        
        # Mode mapping with proper names
        mode_mapping = {
            'T1': {'name': 'Road (T1)', 'vehicle_capacity': 25},
            'T2': {'name': 'Rail (T2)', 'vehicle_capacity': 3000},
            'Road': {'name': 'Road', 'vehicle_capacity': 25},
            'Rail': {'name': 'Rail', 'vehicle_capacity': 3000},
        }
        
        modes = []
        for code in filtered['TRANSPORT CODE'].unique():
            if code in mode_mapping:
                modes.append({
                    "code": code,
                    "name": mode_mapping[code]['name'],
                    "vehicle_capacity": mode_mapping[code]['vehicle_capacity']
                })
            else:
                # Fallback for unknown codes
                modes.append({
                    "code": code,
                    "name": f"Mode {code}",
                    "vehicle_capacity": 0
                })
        
        return sorted(modes, key=lambda x: x['code'])
    except Exception as e:
        print(f"Error loading modes: {e}")
        return []


def get_periods() -> List[str]:
    """Get list of time periods."""
    try:
        logistics_df = load_logistics()
        periods = sorted(logistics_df['TIME PERIOD'].unique())
        return [str(p) for p in periods]
    except Exception as e:
        print(f"Error loading periods: {e}")
        return []


def get_route_data(source: str, destination: str, mode: str, period: str) -> Dict[str, Any]:
    """Get detailed route data for MILP analysis."""
    try:
        logistics_df = load_logistics()
        demand_df = load_demand()
        capacity_df = load_capacity()
        
        # Filter logistics data
        route = logistics_df[
            (logistics_df['FROM IU CODE'] == source) &
            (logistics_df['TO IUGU CODE'] == destination) &
            (logistics_df['TRANSPORT CODE'] == mode) &
            (logistics_df['TIME PERIOD'] == int(period))
        ]
        
        if route.empty:
            return {
                "success": False,
                "error": "Route not found in dataset"
            }
        
        route_data = route.iloc[0]
        
        # Get demand for destination
        dest_demand = demand_df[
            (demand_df['IUGU CODE'] == destination) &
            (demand_df['TIME PERIOD'] == int(period))
        ]
        
        demand_value = dest_demand['DEMAND'].values[0] if not dest_demand.empty else 0
        
        return {
            "success": True,
            "source": source,
            "destination": destination,
            "mode": mode,
            "period": period,
            "freight_cost": float(route_data['FREIGHT COST']),
            "handling_cost": float(route_data['HANDLING COST']),
            "quantity_multiplier": float(route_data['QUANTITY MULTIPLIER']),
            "destination_demand": float(demand_value),
            "message": "Route data retrieved successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
