"""
Cell 10: Post-Solve Diagnostic Report
Generate comprehensive output report and visualizations
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

print("\n--- POST SOLVE DIAGNOSTIC REPORT ---")

total_unmet = 0
total_inv   = 0

for n in model.N:
    for t in model.T:
        if model.unm[n,t].value is not None:
            total_unmet += model.unm[n,t].value
        if model.inv[n,t].value is not None:
            total_inv += model.inv[n,t].value

print("Total Unmet Demand :", round(total_unmet,2))
print("Total Inventory   :", round(total_inv,2))

# Extract shipment results
out = []

for (i,j,mode,t) in model.A:
    q = model.qty[i,j,mode,t].value
    if q is not None and q > 0:
        out.append({
            'FROM': i,
            'TO': j,
            'MODE': mode,
            'TIME': t,
            'QTY': round(q,2)
        })

df = pd.DataFrame(out)

if df.empty:
    print("⚠ WARNING: No shipments generated — dataset may be infeasible or over-constrained.")
else:
    print("Total Shipments:", len(df))
    df.to_csv("Optimization_Output.csv", index=False)
    print("Optimization_Output.csv generated")
    
    # Visualize results
    plt.figure(figsize=(12, 6))
    sns.barplot(data=df, x='FROM', y='QTY', hue='TO')
    plt.title("Dynamic Optimization Result – Judge Dataset")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig("optimization_results.png", dpi=300, bbox_inches='tight')
    plt.show()

print("✔ Diagnostic Report Complete")
