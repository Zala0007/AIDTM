"""
Cell 5: Feasibility Check
Compare total demand vs total capacity
"""

total_demand = demand_df['DEMAND'].sum()
total_capacity = capacity_df['CAPACITY'].sum()

print("\n--- FEASIBILITY CHECK ---")
print("Total Demand:", total_demand)
print("Total Capacity:", total_capacity)

if total_capacity < total_demand:
    print("⚠ WARNING: Capacity < Demand → Infeasible Scenario")
else:
    print("✔ Capacity sufficient")
