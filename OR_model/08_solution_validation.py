"""
Cell 8: Solution Validation
Validate and print the optimization results
"""

print("\n--- SOLUTION VALIDATION ---")

total_unmet = 0
total_inv   = 0

for n in model.N:
    for t in model.T:
        if model.unm[n,t].value is not None:
            total_unmet += model.unm[n,t].value
        if model.inv[n,t].value is not None:
            total_inv += model.inv[n,t].value

print("Total Unmet Demand:", round(total_unmet,2))
print("Total Inventory   :", round(total_inv,2))
