"""
Cell 3: Load CSV Data
Load all required CSV files and standardize column names
"""

import pandas as pd

def load_csv(f):
    df = pd.read_csv(f)
    df.columns = df.columns.str.strip().str.upper()
    return df

# Update paths to point to your data directory
data_dir = "../real_data/"  # Adjust this path as needed

demand_df        = load_csv(f"{data_dir}ClinkerDemand.csv")
capacity_df      = load_csv(f"{data_dir}ClinkerCapacity.csv")
logistics_df     = load_csv(f"{data_dir}LogisticsIUGU.csv")
opening_stock_df = load_csv(f"{data_dir}IUGUOpeningStock.csv")
closing_stock_df = load_csv(f"{data_dir}IUGUClosingStock.csv")
plant_type_df    = load_csv(f"{data_dir}IUGUType.csv")
prod_cost_df     = load_csv(f"{data_dir}ProductionCost.csv")
constraints_df   = load_csv(f"{data_dir}IUGUConstraint.csv")

print("All files dynamically loaded")
