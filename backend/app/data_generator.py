"""
Intelligent Data Generator for Clinker Supply Chain
Creates realistic dummy datasets based on uploaded CSV patterns for training
"""
from __future__ import annotations

import random
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime
from .schemas import (
    IUGUTypeRow,
    IUGUOpeningStockRow,
    IUGUClosingStockRow,
    ProductionCostRow,
    ClinkerCapacityRow,
    ClinkerDemandRow,
    LogisticsIUGURow,
    IUGUConstraintRow,
)


class ClinkerDataGenerator:
    """
    Generates realistic clinker supply chain datasets with proper correlations
    and business logic constraints.
    """
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize generator with optional seed for reproducibility."""
        self.seed = seed
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
    
    def generate_complete_dataset(
        self,
        num_ius: int = 15,
        num_gus: int = 30,
        num_periods: int = 12,
        scenario: str = "balanced",
    ) -> Dict[str, pd.DataFrame]:
        """
        Generate complete dataset with all 8 CSV types.
        
        Args:
            num_ius: Number of Integrated Units (production plants)
            num_gus: Number of Grinding Units (demand centers)
            num_periods: Number of time periods
            scenario: One of "balanced", "high_demand", "capacity_constrained", "strategic"
        
        Returns:
            Dictionary mapping CSV names to DataFrames
        """
        
        # Generate base entities
        ius = [f"IU_{i:03d}" for i in range(1, num_ius + 1)]
        gus = [f"GU_{i:03d}" for i in range(1, num_gus + 1)]
        all_nodes = ius + gus
        
        # Apply scenario-specific parameters
        params = self._get_scenario_parameters(scenario)
        
        datasets = {}
        
        # 1. IUGUType - Define node types
        datasets["IUGUType"] = self._generate_iugu_type(ius, gus)
        
        # 2. Opening Stocks - Initial inventory
        datasets["IUGUOpeningStock"] = self._generate_opening_stock(
            all_nodes, params
        )
        
        # 3. Closing Stock Bounds - Min/Max inventory levels
        datasets["IUGUClosingStock"] = self._generate_closing_stock(
            all_nodes, num_periods, params
        )
        
        # 4. Production Costs - IU production costs
        datasets["ProductionCost"] = self._generate_production_costs(
            ius, num_periods, params
        )
        
        # 5. Clinker Capacity - IU production capacity
        datasets["ClinkerCapacity"] = self._generate_clinker_capacity(
            ius, num_periods, params
        )
        
        # 6. Clinker Demand - GU demand
        datasets["ClinkerDemand"] = self._generate_clinker_demand(
            gus, num_periods, params
        )
        
        # 7. Logistics - Transportation routes and costs
        datasets["LogisticsIUGU"] = self._generate_logistics(
            ius, gus, num_periods, params
        )
        
        # 8. Constraints - Strategic bounds
        datasets["IUGUConstraint"] = self._generate_constraints(
            ius, gus, num_periods, params
        )
        
        return datasets
    
    def _get_scenario_parameters(self, scenario: str) -> Dict:
        """Define parameters for different business scenarios."""
        
        base_params = {
            "capacity_range": (5000, 20000),
            "demand_range": (3000, 12000),
            "production_cost_range": (50, 150),
            "freight_cost_range": (10, 50),
            "handling_cost_range": (5, 20),
            "safety_stock_factor": 0.15,
            "opening_stock_factor": 0.6,
            "demand_variability": 0.2,
            "transport_modes": ["T1", "T2", "T3"],
            "mode_capacity_multipliers": {"T1": 25, "T2": 50, "T3": 35},
        }
        
        if scenario == "high_demand":
            base_params.update({
                "demand_range": (8000, 20000),
                "demand_variability": 0.3,
                "capacity_range": (10000, 25000),
            })
        elif scenario == "capacity_constrained":
            base_params.update({
                "capacity_range": (3000, 12000),
                "demand_range": (5000, 15000),
                "production_cost_range": (80, 200),
            })
        elif scenario == "strategic":
            base_params.update({
                "transport_modes": ["T1", "T2", "T3", "T4"],
                "mode_capacity_multipliers": {"T1": 20, "T2": 45, "T3": 30, "T4": 60},
                "demand_variability": 0.15,
            })
        
        return base_params
    
    def _generate_iugu_type(
        self, ius: List[str], gus: List[str]
    ) -> pd.DataFrame:
        """Generate IUGUType.csv - Node type definitions."""
        
        rows = []
        
        for iu in ius:
            rows.append({
                "IUGU CODE": iu,
                "PLANT TYPE": "IU",
                "# Source": 1.0,
            })
        
        for gu in gus:
            rows.append({
                "IUGU CODE": gu,
                "PLANT TYPE": "GU",
                "# Source": 0.0,
            })
        
        return pd.DataFrame(rows)
    
    def _generate_opening_stock(
        self, nodes: List[str], params: Dict
    ) -> pd.DataFrame:
        """Generate IUGUOpeningStock.csv - Initial inventory."""
        
        rows = []
        capacity_min, capacity_max = params["capacity_range"]
        opening_factor = params["opening_stock_factor"]
        
        for node in nodes:
            capacity = random.uniform(capacity_min, capacity_max)
            opening_stock = capacity * opening_factor * random.uniform(0.8, 1.2)
            
            rows.append({
                "IUGU CODE": node,
                "OPENING STOCK": round(opening_stock, 2),
            })
        
        return pd.DataFrame(rows)
    
    def _generate_closing_stock(
        self, nodes: List[str], num_periods: int, params: Dict
    ) -> pd.DataFrame:
        """Generate IUGUClosingStock.csv - Inventory bounds."""
        
        rows = []
        capacity_min, capacity_max = params["capacity_range"]
        safety_factor = params["safety_stock_factor"]
        
        for node in nodes:
            capacity = random.uniform(capacity_min, capacity_max)
            safety_stock = capacity * safety_factor
            
            for t in range(1, num_periods + 1):
                # Add seasonal variation
                seasonal_factor = 1.0 + 0.1 * np.sin(2 * np.pi * t / 12)
                
                rows.append({
                    "IUGU CODE": node,
                    "TIME PERIOD": t,
                    "MIN CLOSE STOCK": round(safety_stock * seasonal_factor, 2),
                    "MAX CLOSE STOCK": round(capacity * seasonal_factor, 2),
                })
        
        return pd.DataFrame(rows)
    
    def _generate_production_costs(
        self, ius: List[str], num_periods: int, params: Dict
    ) -> pd.DataFrame:
        """Generate ProductionCost.csv - IU production costs."""
        
        rows = []
        cost_min, cost_max = params["production_cost_range"]
        
        for iu in ius:
            base_cost = random.uniform(cost_min, cost_max)
            
            for t in range(1, num_periods + 1):
                # Add time-varying cost (e.g., fuel prices)
                time_variation = 1.0 + 0.05 * np.sin(2 * np.pi * t / 12) + random.uniform(-0.05, 0.05)
                
                rows.append({
                    "IU CODE": iu,
                    "TIME PERIOD": t,
                    "PRODUCTION COST": round(base_cost * time_variation, 2),
                })
        
        return pd.DataFrame(rows)
    
    def _generate_clinker_capacity(
        self, ius: List[str], num_periods: int, params: Dict
    ) -> pd.DataFrame:
        """Generate ClinkerCapacity.csv - IU production capacity."""
        
        rows = []
        capacity_min, capacity_max = params["capacity_range"]
        
        for iu in ius:
            base_capacity = random.uniform(capacity_min, capacity_max)
            
            for t in range(1, num_periods + 1):
                # Add maintenance downtime variation
                maintenance_factor = random.uniform(0.85, 1.0) if random.random() < 0.1 else 1.0
                
                rows.append({
                    "IU CODE": iu,
                    "TIME PERIOD": t,
                    "CAPACITY": round(base_capacity * maintenance_factor, 2),
                })
        
        return pd.DataFrame(rows)
    
    def _generate_clinker_demand(
        self, gus: List[str], num_periods: int, params: Dict
    ) -> pd.DataFrame:
        """Generate ClinkerDemand.csv - GU demand."""
        
        rows = []
        demand_min, demand_max = params["demand_range"]
        variability = params["demand_variability"]
        
        for gu in gus:
            base_demand = random.uniform(demand_min, demand_max)
            
            for t in range(1, num_periods + 1):
                # Add seasonal and random variation
                seasonal = 1.0 + 0.15 * np.sin(2 * np.pi * (t - 3) / 12)  # Peak in summer
                random_var = random.uniform(1 - variability, 1 + variability)
                
                demand = base_demand * seasonal * random_var
                min_fulfillment = random.uniform(0.85, 1.0)
                
                rows.append({
                    "IUGU CODE": gu,
                    "TIME PERIOD": t,
                    "DEMAND": round(demand, 2),
                    "MIN FULFILLMENT (%)": round(min_fulfillment * 100, 1),
                })
        
        return pd.DataFrame(rows)
    
    def _generate_logistics(
        self, ius: List[str], gus: List[str], num_periods: int, params: Dict
    ) -> pd.DataFrame:
        """Generate LogisticsIUGU.csv - Transportation routes."""
        
        rows = []
        freight_min, freight_max = params["freight_cost_range"]
        handling_min, handling_max = params["handling_cost_range"]
        transport_modes = params["transport_modes"]
        mode_capacities = params["mode_capacity_multipliers"]
        
        # Create realistic network: each IU connects to nearby GUs
        for iu in ius:
            # Select 40-70% of GUs as destinations
            num_connections = random.randint(int(len(gus) * 0.4), int(len(gus) * 0.7))
            connected_gus = random.sample(gus, num_connections)
            
            for gu in connected_gus:
                # Determine available modes (not all modes on all routes)
                available_modes = random.sample(
                    transport_modes,
                    k=random.randint(1, len(transport_modes))
                )
                
                for mode in available_modes:
                    # Calculate distance-based cost (simplified)
                    iu_idx = int(iu.split("_")[1])
                    gu_idx = int(gu.split("_")[1])
                    distance_factor = 1.0 + 0.01 * abs(iu_idx - gu_idx)
                    
                    base_freight = random.uniform(freight_min, freight_max) * distance_factor
                    base_handling = random.uniform(handling_min, handling_max)
                    capacity = mode_capacities.get(mode, 30)
                    
                    for t in range(1, num_periods + 1):
                        # Add time variation (fuel costs)
                        time_factor = 1.0 + 0.05 * random.uniform(-1, 1)
                        
                        rows.append({
                            "FROM IU CODE": iu,
                            "TO IUGU CODE": gu,
                            "TRANSPORT CODE": mode,
                            "TIME PERIOD": t,
                            "FREIGHT COST": round(base_freight * time_factor, 2),
                            "HANDLING COST": round(base_handling, 2),
                            "QUANTITY MULTIPLIER": capacity,
                        })
        
        return pd.DataFrame(rows)
    
    def _generate_constraints(
        self, ius: List[str], gus: List[str], num_periods: int, params: Dict
    ) -> pd.DataFrame:
        """Generate IUGUConstraint.csv - Strategic constraints."""
        
        rows = []
        transport_modes = params["transport_modes"]
        
        # Strategy 1: Force minimum rail usage (lower carbon)
        if "T2" in transport_modes:  # Assume T2 is rail
            for iu in random.sample(ius, k=min(5, len(ius))):
                for t in range(1, num_periods + 1):
                    rows.append({
                        "IU CODE": iu,
                        "TRANSPORT CODE": "T2",
                        "IUGU CODE": None,
                        "TIME PERIOD": t,
                        "BOUND TYPEID": "L",
                        "VALUE TYPEID": "MIN_RAIL",
                        "Value": random.uniform(500, 2000),
                    })
        
        # Strategy 2: Limit specific routes for capacity reasons
        for _ in range(10):
            iu = random.choice(ius)
            gu = random.choice(gus)
            mode = random.choice(transport_modes)
            t = random.randint(1, num_periods)
            
            rows.append({
                "IU CODE": iu,
                "TRANSPORT CODE": mode,
                "IUGU CODE": gu,
                "TIME PERIOD": t,
                "BOUND TYPEID": "U",
                "VALUE TYPEID": "MAX_ROUTE",
                "Value": random.uniform(1000, 5000),
            })
        
        # Strategy 3: Global IU output targets
        for iu in random.sample(ius, k=min(3, len(ius))):
            for t in range(1, num_periods + 1):
                rows.append({
                    "IU CODE": iu,
                    "TRANSPORT CODE": None,
                    "IUGU CODE": None,
                    "TIME PERIOD": t,
                    "BOUND TYPEID": "L",
                    "VALUE TYPEID": "MIN_OUTPUT",
                    "Value": random.uniform(5000, 15000),
                })
        
        return pd.DataFrame(rows)
    
    def save_datasets_to_csv(
        self,
        datasets: Dict[str, pd.DataFrame],
        output_dir: str,
        prefix: str = ""
    ) -> List[str]:
        """
        Save generated datasets to CSV files.
        
        Args:
            datasets: Dictionary of DataFrames
            output_dir: Output directory path
            prefix: Optional prefix for filenames
        
        Returns:
            List of created file paths
        """
        from pathlib import Path
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        created_files = []
        
        for name, df in datasets.items():
            filename = f"{prefix}{name}.csv" if prefix else f"{name}.csv"
            filepath = output_path / filename
            df.to_csv(filepath, index=False)
            created_files.append(str(filepath))
        
        return created_files
    
    def generate_variations(
        self,
        base_datasets: Dict[str, pd.DataFrame],
        num_variations: int = 5,
        variation_factor: float = 0.15
    ) -> List[Dict[str, pd.DataFrame]]:
        """
        Generate multiple variations of a base dataset for training/testing.
        
        Args:
            base_datasets: Original datasets
            num_variations: Number of variations to create
            variation_factor: How much to vary (0.15 = ±15%)
        
        Returns:
            List of varied datasets
        """
        variations = []
        
        for i in range(num_variations):
            varied = {}
            
            for name, df in base_datasets.items():
                df_copy = df.copy()
                
                # Apply random variations to numeric columns
                numeric_cols = df_copy.select_dtypes(include=[np.number]).columns
                
                for col in numeric_cols:
                    if col not in ["TIME PERIOD", "# Source"]:
                        variation = np.random.uniform(
                            1 - variation_factor,
                            1 + variation_factor,
                            size=len(df_copy)
                        )
                        df_copy[col] = df_copy[col] * variation
                
                varied[name] = df_copy
            
            variations.append(varied)
        
        return variations


def generate_training_datasets(
    output_dir: str,
    num_scenarios: int = 10,
    seed: Optional[int] = None
) -> Dict[str, List[str]]:
    """
    Generate multiple training datasets with different scenarios.
    
    Args:
        output_dir: Base output directory
        num_scenarios: Number of different scenarios to generate
        seed: Random seed for reproducibility
    
    Returns:
        Dictionary mapping scenario names to file lists
    """
    from pathlib import Path
    
    generator = ClinkerDataGenerator(seed=seed)
    all_files = {}
    
    scenarios = ["balanced", "high_demand", "capacity_constrained", "strategic"]
    
    for i in range(num_scenarios):
        scenario = scenarios[i % len(scenarios)]
        scenario_name = f"scenario_{i+1:02d}_{scenario}"
        
        # Generate dataset
        datasets = generator.generate_complete_dataset(
            num_ius=random.randint(10, 20),
            num_gus=random.randint(20, 40),
            num_periods=random.randint(4, 12),
            scenario=scenario,
        )
        
        # Save to disk
        scenario_dir = str(Path(output_dir) / scenario_name)
        files = generator.save_datasets_to_csv(datasets, scenario_dir)
        all_files[scenario_name] = files
    
    return all_files
