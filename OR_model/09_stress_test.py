"""
Cell 9: Stress Test
Test model with +30% demand increase
"""

from pyomo.opt import SolverFactory

print("\n--- LIVE STRESS TEST: +30% DEMAND ---")
demand_df['DEMAND'] *= 1.30
print("New Total Demand:", demand_df['DEMAND'].sum())

# Re-solve with updated demand
solver = SolverFactory('cbc')
result = solver.solve(model)

print(f"Stress Test Solver Status: {result.solver.status}")
