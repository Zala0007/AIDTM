# ClinkerFlow Optimization Backend (FastAPI + PuLP)

## Setup

```powershell
cd E:\adani\backend
python -m pip install -r requirements.txt
```

## Run

From the `backend` folder:

```powershell
cd E:\adani\backend
python -m uvicorn app.main:app --reload --port 8000
```

## Data Files (real_data/)

- ClinkerDemand.csv: Demand per IUGU and time period (used to build demand vectors).
- ClinkerCapacity.csv: IU production capacity per period (maps to max_production_per_period).
- ProductionCost.csv: IU production cost per period (used as production_cost).
- IUGUOpeningStock.csv: Initial inventory per IUGU (initial_inventory).
- IUGUClosingStock.csv: Min/Max closing stock per period (drives safety_stock and max_capacity).
- IUGUType.csv: Plant type mapping (IU vs GU) for each IUGU code.
- LogisticsIUGU.csv: Route definitions (origin IU → destination IUGU) with transport code, cost, and capacity per trip.
- IUGUConstraint.csv: Additional bounds; currently not modeled directly but available for future constraints.

If your shell is not launched from `backend/`, use:

```powershell
python -m uvicorn app.main:app --reload --port 8000 --app-dir E:\adani\backend
```

## API

- `GET /health` → `{ "ok": true }`
- `POST /optimize` → runs the MILP and returns status + cost + trip schedule

### Example request

```json
{
  "T": 4,
  "plants": [
    {
      "id": "IU1",
      "name": "Integrated Unit 1",
      "type": "IU",
      "initial_inventory": 500,
      "max_capacity": 2000,
      "safety_stock": 200,
      "holding_cost": 0.1,
      "production_cost": 30,
      "max_production_per_period": 800
    },
    {
      "id": "GU1",
      "name": "Grinding Unit 1",
      "type": "GU",
      "initial_inventory": 200,
      "max_capacity": 1500,
      "safety_stock": 150,
      "holding_cost": 0.1
    }
  ],
  "routes": [
    {
      "id": "R1",
      "origin_id": "IU1",
      "destination_id": "GU1",
      "minimum_shipment_batch_quantity": 100,
      "modes": [
        { "mode": "road", "unit_cost": 5, "capacity_per_trip": 200 },
        { "mode": "rail", "unit_cost": 3, "capacity_per_trip": 500 }
      ]
    }
  ],
  "demand": {
    "GU1": [300, 300, 300, 300]
  }
}
```

### Example response (shape)

```json
{
  "status": "Optimal",
  "total_cost": 123456.78,
  "scheduled_trips": [
    {
      "period": 1,
      "route_id": "R1",
      "origin_id": "IU1",
      "destination_id": "GU1",
      "mode": "rail",
      "num_trips": 1,
      "quantity_shipped": 500
    }
  ]
}
```
