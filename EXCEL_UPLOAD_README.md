# Advanced Optimization Platform - Excel Upload Feature

## Overview
The Advanced Optimization section now supports uploading Excel files with supply chain data for comprehensive route analytics and optimization.

## Files

### Backend
- `backend/app/excel_parser.py` - Excel data parser using pandas and openpyxl
- `backend/app/excel_api.py` - FastAPI router for Excel-based endpoints
- Updated `backend/app/main_v2.py` - Includes Excel API router

### Frontend
- `frontend/src/lib/excelApi.ts` - TypeScript API client for Excel endpoints
- Updated `frontend/src/app/advanced-optimization/components/AdvancedOptimizationInteractive.tsx` - UI component with Excel upload and route analytics

## Excel File Format

The system expects an Excel file (`.xlsx` or `.xls`) with the following sheets:

### Required Sheets

1. **IUGUType** - IU-GU plant relationships
   - Columns: `IU CODE`, `GU CODE`

2. **IUGUOpeningStock** - Initial inventory levels
   - Columns: `IUGU CODE`, `OPENING STOCK`

3. **IUGUClosingStock** - Target inventory levels
   - Columns: `IUGU CODE`, `CLOSING STOCK`

4. **ProductionCost** - Production costs per plant
   - Columns: Plant code (column 1), Cost (column 2)

5. **ClinkerCapacity** - Production capacity
   - Columns: Plant code (column 1), Capacity (column 2)

6. **ClinkerDemand** - Demand forecasts
   - Columns: Plant code, Period columns (T1, T2, ...)

7. **LogisticsIUGU** - Transport logistics
   - Columns: `IU CODE`, `GU CODE`, `TRANSPORT CODE`, `FREIGHT`, `HANDLING`, `VEHICLE CAPACITY`

### Optional Sheets
- **IUGUConstraint** - Additional constraints
- **TransportModes** - Transport mode details

## API Endpoints

All endpoints are prefixed with `/api`

### POST /api/upload
Upload Excel file for processing.

**Request:**
- `file`: Excel file (.xlsx or .xls)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "sheets_found": ["IUGUType", "LogisticsIUGU", ...],
  "total_routes": 250,
  "total_plants": 465,
  "periods": ["T1", "T2", ...],
  "warnings": []
}
```

### POST /api/load-default
Load default CSV data from project folder.

### GET /api/sources
Get list of source plants (IU codes).

**Response:**
```json
{
  "sources": ["IU001", "IU002", ...]
}
```

### GET /api/destinations/:source
Get destinations for a specific source.

**Response:**
```json
{
  "destinations": ["GU001", "GU002", ...]
}
```

### GET /api/modes/:source/:destination
Get transport modes for a route.

**Response:**
```json
{
  "modes": [
    {
      "code": "T1",
      "name": "Mode T1",
      "vehicle_capacity": 30
    }
  ]
}
```

### GET /api/periods
Get available time periods.

**Response:**
```json
{
  "periods": ["T1", "T2", "T3", ...]
}
```

### GET /api/route
Get comprehensive route analytics.

**Query Parameters:**
- `source`: Source plant code
- `destination`: Destination plant code
- `mode`: Transport mode code
- `period`: Time period

**Response:**
```json
{
  "source": "IU001",
  "destination": "GU002",
  "mode": "T1",
  "period": "T1",
  "freight_cost": 1500,
  "handling_cost": 200,
  "transport_capacity": 30,
  "source_capacity": 10000,
  "destination_demand": 5000,
  "production_cost": 2000,
  "source_opening_stock": 1000,
  "data_completeness": {
    "logistics": true,
    "capacity": true,
    "demand": true,
    "costs": true,
    "inventory": true,
    "constraints": false
  },
  "advanced_metrics": {
    "cost_per_trip": 1700,
    "capacity_utilization_pct": 83.3,
    "load_efficiency_pct": 83.3,
    "recommended_quantity": 5000,
    "recommended_trips": 167,
    "potential_savings": 0
  }
}
```

### GET /api/model
Get mathematical model description (MILP formulation).

### GET /api/health
Check API health and data load status.

## Usage

### 1. Upload Excel File
Navigate to Advanced Optimization → Data Upload & Analysis tab.
- Drag and drop Excel file or click to browse
- System validates file structure and required sheets
- Shows data completeness indicators

### 2. Select Route
Once data is loaded:
1. Select **Source Plant** from dropdown
2. Select **Destination Plant** (filtered by source)
3. Select **Transport Mode** (filtered by route)
4. Select **Time Period**
5. Click **Analyze Route**

### 3. View Analytics
The system displays:
- **Cost Efficiency**: Cost per trip, logistics costs, production costs
- **Capacity Metrics**: Utilization, available capacity, bottleneck indicators
- **Inventory Data**: Stock levels, turnover, safety stock coverage
- **Transport Metrics**: Load efficiency, trips to meet demand, utilization
- **Demand Analysis**: Fulfillment potential, supply-demand ratio
- **Optimization Recommendations**: Recommended quantity, trips, potential savings

### 4. Mathematical Model
View the complete MILP model formulation:
- Objective function (cost minimization)
- Decision variables (production, shipment, trips, inventory)
- Constraints (mass balance, capacity, batch size, inventory bounds)
- Parameters and indices

## Running the Application

### Backend
```bash
cd backend
python -m uvicorn app.main_v2:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

Visit: `http://localhost:3000/advanced-optimization`

## Development Notes

- Excel parsing uses pandas and openpyxl
- Parser validates required sheets and columns
- Global state stores uploaded data (use database in production)
- Frontend uses TypeScript with type-safe API client
- All endpoints include error handling and validation
- CORS enabled for local development

## Error Handling

### Common Errors

**"Missing required sheets"**
- Ensure Excel file contains all 7 required sheets with correct names

**"No data uploaded. Please upload Excel file first"**
- Upload Excel file before accessing route endpoints

**"Invalid file type"**
- Only .xlsx and .xls files supported

**"Failed to parse sheet"**
- Check sheet structure and column names match expected format

## Example Data

Sample Excel files should be structured with:
- Plant codes as strings (e.g., "IU001", "GU002")
- Numeric values for costs, capacities, demands
- Period columns named T1, T2, T3, etc.
- Transport codes as strings (e.g., "T1", "T2", "T3")

See `real_data/` folder for CSV examples that can be converted to Excel format.

## Future Enhancements

- [ ] Database storage for uploaded data
- [ ] Multi-file upload support
- [ ] CSV to Excel conversion
- [ ] Batch route analysis
- [ ] Export results to Excel
- [ ] Advanced filtering and search
- [ ] Historical data tracking
- [ ] Comparison across uploads
