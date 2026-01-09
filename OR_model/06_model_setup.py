"""
Cell 6: Model Setup
Prepare sets and parameters for the optimization model
"""

# Define time periods
T = sorted(demand_df['TIME PERIOD'].unique())

# Define nodes (all IU and GU units)
Nodes = plant_type_df['IUGU CODE'].unique()

# Define arcs (routes with transport modes)
Arcs = list(set(zip(logistics_df['FROM IU CODE'],
                    logistics_df['TO IUGU CODE'],
                    logistics_df['TRANSPORT CODE'],
                    logistics_df['TIME PERIOD'])))

# Create demand dictionary
demand = demand_df.set_index(['IUGU CODE','TIME PERIOD'])['DEMAND'].to_dict()

# Create opening stock dictionary
opening = opening_stock_df.set_index('IUGU CODE')['OPENING STOCK'].to_dict()

print(f"Time Periods: {len(T)}")
print(f"Nodes: {len(Nodes)}")
print(f"Arcs: {len(Arcs)}")
