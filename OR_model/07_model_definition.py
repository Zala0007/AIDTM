"""
Cell 7: Model Definition and Solve
Create Pyomo optimization model and solve
"""

import pyomo.environ as pyo
from pyomo.opt import SolverFactory

# Create concrete model
model = pyo.ConcreteModel()

# Sets
model.N = pyo.Set(initialize=Nodes)
model.T = pyo.Set(initialize=T)
model.A = pyo.Set(initialize=Arcs)

# Variables
model.qty = pyo.Var(model.A, domain=pyo.NonNegativeReals)  # Shipment quantities
model.inv = pyo.Var(model.N, model.T, domain=pyo.NonNegativeReals)  # Inventory levels
model.unm = pyo.Var(model.N, model.T, domain=pyo.NonNegativeReals)  # Unmet demand

# Objective: Minimize unmet demand
model.obj = pyo.Objective(
    expr=sum(model.unm[n,t]*1e6 for n in model.N for t in model.T),
    sense=pyo.minimize
)

# Solve the model
solver = SolverFactory('cbc')
result = solver.solve(model)

print("Optimization Completed")
print(f"Solver Status: {result.solver.status}")
print(f"Termination Condition: {result.solver.termination_condition}")
