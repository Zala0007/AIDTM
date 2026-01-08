from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd


def _fill_numeric_na(df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
    for c in cols:
        if c in df.columns:
            if df[c].isna().all():
                df[c] = 0
            else:
                df[c] = df[c].fillna(df[c].mean(numeric_only=True))
    return df


def build_initial_data(
    *,
    real_data_dir: Path,
    T: int = 4,
    limit_plants: int = 240,
    limit_routes: int = 250,
    scenario_name: str = "Base",
    seed: int = 42,
) -> Dict[str, Any]:
    """Load CSVs and return a compact JSON-ready dict.

    This now prioritizes the new real_data format (ClinkerDemand.csv, IUGU*.csv, LogisticsIUGU.csv).
    If those files are missing, it falls back to the legacy dataset.
    """

    new_demand = real_data_dir / "ClinkerDemand.csv"
    if new_demand.exists():
        return _build_from_new_real_data(
            real_data_dir=real_data_dir,
            T=T,
            limit_plants=limit_plants,
            limit_routes=limit_routes,
        )

    # Legacy path kept for compatibility.
    rng = np.random.default_rng(seed)

    plants_csv = real_data_dir / "Clinker_Plants_465_Varied.csv"
    transport_csv = real_data_dir / "Transport_Matrix_Clinker_Realistic.csv"
    forecast_csv = real_data_dir / "Forecast_Demand_465_Plants_With_Names.csv"
    scenario_csv_a = real_data_dir / "Demand_Scenarios_465_Plants.csv"
    scenario_csv_b = real_data_dir / "Scenario_Demand_465_Plants.csv"

    plants_df = pd.read_csv(plants_csv)
    plants_df["Type"] = plants_df["Type"].fillna("GU")
    plants_df["Region"] = plants_df["Region"].fillna("UNKNOWN")
    plants_df = _fill_numeric_na(plants_df, ["Max Prod (MT/Mo)", "Max Inv (MT)", "Cost/MT"])

    if len(plants_df) > limit_plants:
        take_idx = rng.choice(len(plants_df), size=limit_plants, replace=False)
        plants_df = plants_df.iloc[np.sort(take_idx)].reset_index(drop=True)

    plant_ids = set(plants_df["Plant_ID"].astype(str).tolist())

    demand_df = None
    if scenario_csv_a.exists():
        demand_df = pd.read_csv(scenario_csv_a)
    elif scenario_csv_b.exists():
        demand_df = pd.read_csv(scenario_csv_b)

    forecast_df = pd.read_csv(forecast_csv)

    if demand_df is not None and "Scenario_Name" in demand_df.columns:
        demand_df["Scenario_Name"] = demand_df["Scenario_Name"].fillna("Base")
        demand_df = demand_df.rename(columns={"Scenario_Demand_MT": "Demand_MT"})
        if "Demand_MT" not in demand_df.columns and "Scenario_Demand_MT" in demand_df.columns:
            demand_df["Demand_MT"] = demand_df["Scenario_Demand_MT"]

        demand_df = _fill_numeric_na(demand_df, ["Period", "Demand_MT"])
        demand_df["Plant_ID"] = demand_df["Plant_ID"].astype(str)
        demand_df = demand_df[demand_df["Plant_ID"].isin(plant_ids)]
        demand_df = demand_df[demand_df["Period"].between(1, T)]
        demand_df = demand_df[demand_df["Scenario_Name"].astype(str) == scenario_name]

    forecast_df = forecast_df.rename(columns={"Forecast_Demand_MT": "Demand_MT"})
    forecast_df = _fill_numeric_na(forecast_df, ["Period", "Demand_MT"])
    forecast_df["Plant_ID"] = forecast_df["Plant_ID"].astype(str)
    forecast_df = forecast_df[forecast_df["Plant_ID"].isin(plant_ids)]
    forecast_df = forecast_df[forecast_df["Period"].between(1, T)]

    demand: Dict[str, List[float]] = {pid: [0.0] * T for pid in plant_ids}

    def _apply_rows(df: pd.DataFrame):
        for _, row in df.iterrows():
            pid = str(row["Plant_ID"])
            t = int(row["Period"])
            val = float(row["Demand_MT"])
            if pid in demand and 1 <= t <= T:
                demand[pid][t - 1] = max(0.0, val)

    if demand_df is not None and len(demand_df) > 0:
        _apply_rows(demand_df)
    else:
        _apply_rows(forecast_df)

    transport_df = pd.read_csv(transport_csv)
    transport_df["Source_Plant_ID"] = transport_df["Source_Plant_ID"].astype(str)
    transport_df["Destination_Plant_ID"] = transport_df["Destination_Plant_ID"].astype(str)

    transport_df = transport_df[
        transport_df["Source_Plant_ID"].isin(plant_ids)
        & transport_df["Destination_Plant_ID"].isin(plant_ids)
        & (transport_df["Source_Plant_ID"] != transport_df["Destination_Plant_ID"])
    ]

    transport_df["Transport_Mode"] = transport_df["Transport_Mode"].fillna("Unknown")
    transport_df = _fill_numeric_na(
        transport_df,
        ["Cost_per_MT", "Capacity_per_Trip_MT", "Minimum_Shipment_Batch_MT"],
    )

    if len(transport_df) > limit_routes:
        take_idx = rng.choice(len(transport_df), size=limit_routes, replace=False)
        transport_df = transport_df.iloc[np.sort(take_idx)].reset_index(drop=True)

    grouped: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for _, row in transport_df.iterrows():
        src = str(row["Source_Plant_ID"])
        dst = str(row["Destination_Plant_ID"])
        mode = str(row["Transport_Mode"])
        key = (src, dst)

        sbq = float(row["Minimum_Shipment_Batch_MT"])
        if key not in grouped:
            grouped[key] = {
                "id": f"{src}->{dst}",
                "origin_id": src,
                "destination_id": dst,
                "minimum_shipment_batch_quantity": max(0.0, sbq),
                "modes": [],
            }

        grouped[key]["minimum_shipment_batch_quantity"] = max(
            grouped[key]["minimum_shipment_batch_quantity"], max(0.0, sbq)
        )

        grouped[key]["modes"].append(
            {
                "mode": mode.lower(),
                "unit_cost": float(row["Cost_per_MT"]),
                "capacity_per_trip": float(row["Capacity_per_Trip_MT"]),
            }
        )

    routes = list(grouped.values())

    plants: List[Dict[str, Any]] = []
    for _, row in plants_df.iterrows():
        pid = str(row["Plant_ID"])
        ptype = str(row["Type"]).strip().upper()
        max_inv = float(row["Max Inv (MT)"])
        max_prod = float(row["Max Prod (MT/Mo)"])
        cost = float(row["Cost/MT"])

        safety = max(0.0, 0.20 * max_inv)
        initial = max(safety, 0.60 * max_inv)

        plants.append(
            {
                "id": pid,
                "name": str(row.get("Plant Name", "")) or None,
                "type": "IU" if ptype == "IU" else "GU",
                "initial_inventory": float(initial),
                "max_capacity": float(max_inv),
                "safety_stock": float(safety),
                "holding_cost": float(max(0.0, 0.005 * cost)),
                "production_cost": float(cost) if ptype == "IU" else None,
                "max_production_per_period": float(max_prod) if ptype == "IU" else None,
            }
        )

    return {
        "T": T,
        "scenario": scenario_name,
        "plants": plants,
        "routes": routes,
        "demand": demand,
        "limits": {"plants": limit_plants, "routes": limit_routes},
        "source_files": {
            "plants": plants_csv.name,
            "transport": transport_csv.name,
            "forecast": forecast_csv.name,
            "scenario": (demand_df is not None),
        },
    }


def _build_from_new_real_data(
    *,
    real_data_dir: Path,
    T: int = 4,
    limit_plants: int,
    limit_routes: int,
) -> Dict[str, Any]:
    """Ingest the new real_data CSV suite into the API payload shape."""

    type_df = pd.read_csv(real_data_dir / "IUGUType.csv")
    opening_df = pd.read_csv(real_data_dir / "IUGUOpeningStock.csv")
    closing_df = pd.read_csv(real_data_dir / "IUGUClosingStock.csv")
    demand_df = pd.read_csv(real_data_dir / "ClinkerDemand.csv")
    capacity_df = pd.read_csv(real_data_dir / "ClinkerCapacity.csv")
    prod_cost_df = pd.read_csv(real_data_dir / "ProductionCost.csv")
    logistics_df = pd.read_csv(real_data_dir / "LogisticsIUGU.csv")

    # Detect max period across demand, capacity, logistics
    max_period = 1
    for df, col in [
        (demand_df, "TIME PERIOD"),
        (capacity_df, "TIME PERIOD"),
        (logistics_df, "TIME PERIOD"),
    ]:
        if col in df.columns:
            max_period = max(max_period, int(df[col].max()))

    T_final = max(T, max_period)

    # Plant types
    type_df["PLANT TYPE"] = type_df["PLANT TYPE"].fillna("GU")
    plant_type: Dict[str, str] = {
        str(row["IUGU CODE"]): str(row["PLANT TYPE"]).strip().upper()
        for _, row in type_df.iterrows()
    }

    plant_ids = list(plant_type.keys())
    if limit_plants and len(plant_ids) > limit_plants:
        plant_ids = plant_ids[:limit_plants]

    # Opening stock
    opening: Dict[str, float] = {
        str(row["IUGU CODE"]): float(row["OPENING STOCK"])
        for _, row in opening_df.iterrows()
        if str(row["IUGU CODE"]) in plant_ids
    }

    # Closing stock bounds
    min_close: Dict[str, float] = {}
    max_close: Dict[str, float] = {}
    for _, row in closing_df.iterrows():
        pid = str(row["IUGU CODE"])
        if pid not in plant_ids:
            continue
        min_val = row.get("MIN CLOSE STOCK")
        max_val = row.get("MAX CLOSE STOCK")
        if pd.notna(min_val):
            min_close[pid] = min(min_close.get(pid, float("inf")), float(min_val))
        if pd.notna(max_val):
            max_close[pid] = max(max_close.get(pid, 0.0), float(max_val))

    # Production costs per IU
    prod_costs: Dict[str, float] = {}
    for pid, grp in prod_cost_df.groupby("IU CODE"):
        if pid not in plant_ids:
            continue
        prod_costs[str(pid)] = float(grp["PRODUCTION COST"].mean())

    # Production capacities per IU (use the minimum across periods to be conservative)
    prod_caps: Dict[str, float] = {}
    for pid, grp in capacity_df.groupby("IU CODE"):
        if pid not in plant_ids:
            continue
        prod_caps[str(pid)] = float(grp["CAPACITY"].min())

    # Demand by plant and period
    demand: Dict[str, List[float]] = {pid: [0.0] * T_final for pid in plant_ids}
    for _, row in demand_df.iterrows():
        pid = str(row["IUGU CODE"])
        if pid not in demand:
            continue
        t = int(row["TIME PERIOD"])
        if 1 <= t <= T_final:
            demand[pid][t - 1] = float(row["DEMAND"])

    # Routes from LogisticsIUGU
    logistics_df["FROM IU CODE"] = logistics_df["FROM IU CODE"].astype(str)
    logistics_df["TO IUGU CODE"] = logistics_df["TO IUGU CODE"].astype(str)
    logistics_df["TRANSPORT CODE"] = logistics_df["TRANSPORT CODE"].astype(str)

    grouped_routes: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for _, row in logistics_df.iterrows():
        src = row["FROM IU CODE"]
        dst = row["TO IUGU CODE"]
        if src not in plant_ids or dst not in plant_ids:
            continue

        key = (src, dst)
        freight = float(row.get("FREIGHT COST", 0.0))
        handling = float(row.get("HANDLING COST", 0.0))
        qty_mult = float(row.get("QUANTITY MULTIPLIER", 1.0) or 1.0)
        cost = freight + handling

        if key not in grouped_routes:
            grouped_routes[key] = {
                "id": f"{src}->{dst}",
                "origin_id": src,
                "destination_id": dst,
                "minimum_shipment_batch_quantity": 0.0,
                "modes": [],
            }

        grouped_routes[key]["modes"].append(
            {
                "mode": row["TRANSPORT CODE"].lower(),
                "unit_cost": cost,
                "capacity_per_trip": max(1.0, qty_mult),
            }
        )

    routes = list(grouped_routes.values())
    if limit_routes and len(routes) > limit_routes:
        routes = routes[:limit_routes]

    # Build plants
    plants: List[Dict[str, Any]] = []
    for pid in plant_ids:
        ptype = plant_type.get(pid, "GU")
        opening_stock = opening.get(pid, 0.0)
        safety = float(min_close.get(pid, 0.0)) if pid in min_close else 0.0
        max_cap = float(max_close.get(pid, opening_stock * 1.5))
        prod_cost = prod_costs.get(pid) if ptype == "IU" else None
        prod_cap = prod_caps.get(pid) if ptype == "IU" else None

        plants.append(
            {
                "id": pid,
                "name": pid,
                "type": "IU" if ptype == "IU" else "GU",
                "initial_inventory": float(opening_stock),
                "max_capacity": max_cap,
                "safety_stock": safety,
                "holding_cost": float(max(0.0, 0.005 * (prod_cost or 1000.0))),
                "production_cost": prod_cost if ptype == "IU" else None,
                "max_production_per_period": prod_cap if ptype == "IU" else None,
            }
        )

    return {
        "T": T_final,
        "scenario": "Clinker_NewData",
        "plants": plants,
        "routes": routes,
        "demand": demand,
        "limits": {"plants": limit_plants, "routes": limit_routes},
        "source_files": {
            "demand": "ClinkerDemand.csv",
            "capacity": "ClinkerCapacity.csv",
            "opening_stock": "IUGUOpeningStock.csv",
            "closing_stock": "IUGUClosingStock.csv",
            "types": "IUGUType.csv",
            "logistics": "LogisticsIUGU.csv",
            "production_cost": "ProductionCost.csv",
        },
    }


def main() -> None:
    here = Path(__file__).resolve().parent
    real_data_dir = here.parent / "real_data"
    out_dir = here / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    payload = build_initial_data(real_data_dir=real_data_dir)

    out_path = out_dir / "initial_data.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
