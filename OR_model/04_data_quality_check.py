"""
Cell 4: Data Quality Check
Verify data integrity and print summary statistics
"""

print("\n--- DATA QUALITY CHECK ---")
print("Demand Rows:", len(demand_df))
print("Capacity Rows:", len(capacity_df))
print("Routes:", len(logistics_df))

print("\nMissing Values:")
print(demand_df.isnull().sum())

print("\nIU Units:", capacity_df['IU CODE'].unique())
print("GU Units:", demand_df[demand_df['DEMAND']>0]['IUGU CODE'].unique())
print("\nIU → GU Routes:")
print(logistics_df[['FROM IU CODE','TO IUGU CODE']].drop_duplicates())
