"""
Excel-based API endpoints for Advanced Optimization Platform
Handles Excel file upload and route analytics
"""
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import logging

from .excel_parser import ExcelDataParser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["excel-optimization"])

# Global storage for uploaded data (in production, use database or cache)
_uploaded_data: Optional[ExcelDataParser] = None


@router.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    """
    Upload Excel file with supply chain data
    
    Expected sheets:
    - IUGUType: IU-GU relationships
    - IUGUOpeningStock: Initial inventory
    - IUGUClosingStock: Target inventory
    - ProductionCost: Production costs
    - ClinkerCapacity: Production capacity
    - ClinkerDemand: Demand forecasts
    - LogisticsIUGU: Transport logistics
    """
    global _uploaded_data
    
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload .xlsx or .xls file"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse Excel file
        parser = ExcelDataParser(content)
        result = parser.parse()
        
        if not result['success']:
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'errors': result['errors'],
                    'warnings': result.get('warnings', [])
                }
            )
        
        # Store parser for subsequent requests
        _uploaded_data = parser
        
        return {
            'success': True,
            'message': 'File uploaded successfully',
            'sheets_found': result['metadata']['sheets'],
            'total_routes': result['metadata']['total_routes'],
            'total_plants': result['metadata']['total_plants'],
            'periods': result['metadata']['periods'],
            'warnings': result.get('warnings', [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/load-default")
async def load_default_data():
    """
    Load default CSV data from project folder
    """
    global _uploaded_data
    
    try:
        # In a real implementation, load from CSV files in real_data folder
        # For now, return success with placeholder data
        return {
            'success': True,
            'message': 'Default data loaded',
            'sheets': ['IUGUType', 'ClinkerDemand', 'LogisticsIUGU'],
            'total_routes': 0,
            'total_plants': 0,
            'periods': []
        }
        
    except Exception as e:
        logger.error(f"Load default error: {str(e)}")
        return {
            'success': False,
            'error': f"Failed to load default data: {str(e)}"
        }


@router.get("/sources")
async def get_sources():
    """Get list of source plants (IU codes)"""
    global _uploaded_data
    
    if _uploaded_data is None:
        raise HTTPException(status_code=400, detail="No data uploaded. Please upload Excel file first.")
    
    try:
        sources = _uploaded_data.get_sources()
        return {'sources': sources}
    except Exception as e:
        logger.error(f"Get sources error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/destinations/{source}")
async def get_destinations(source: str):
    """Get list of destination plants for a source"""
    global _uploaded_data
    
    if _uploaded_data is None:
        raise HTTPException(status_code=400, detail="No data uploaded")
    
    try:
        destinations = _uploaded_data.get_destinations(source)
        return {'destinations': destinations}
    except Exception as e:
        logger.error(f"Get destinations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/modes/{source}/{destination}")
async def get_modes(source: str, destination: str):
    """Get transport modes for a route"""
    global _uploaded_data
    
    if _uploaded_data is None:
        raise HTTPException(status_code=400, detail="No data uploaded")
    
    try:
        modes = _uploaded_data.get_modes(source, destination)
        return {'modes': modes}
    except Exception as e:
        logger.error(f"Get modes error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/periods")
async def get_periods():
    """Get available time periods"""
    global _uploaded_data
    
    if _uploaded_data is None:
        raise HTTPException(status_code=400, detail="No data uploaded")
    
    try:
        periods = _uploaded_data.get_periods()
        return {'periods': periods}
    except Exception as e:
        logger.error(f"Get periods error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/route")
async def get_route_data(
    source: str = Query(..., description="Source plant code"),
    destination: str = Query(..., description="Destination plant code"),
    mode: str = Query(..., description="Transport mode code"),
    period: str = Query(..., description="Time period")
):
    """Get comprehensive route analytics data"""
    global _uploaded_data
    
    if _uploaded_data is None:
        raise HTTPException(status_code=400, detail="No data uploaded")
    
    try:
        route_data = _uploaded_data.get_route_data(source, destination, mode, period)
        return route_data
    except Exception as e:
        logger.error(f"Get route data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model")
async def get_math_model():
    """Get mathematical model description"""
    model = {
        'success': True,
        'model': {
            'name': 'Multi-Period Clinker Supply Chain MILP',
            'type': 'Mixed-Integer Linear Programming',
            'objective': {
                'type': 'Minimization',
                'description': 'Minimize total supply chain costs including production, transport, and inventory holding',
                'formula': 'min Z = Σ(C_prod × P) + Σ(C_trans × X) + Σ(C_hold × I)',
                'components': [
                    {'name': 'Production Cost', 'formula': 'Σ(C_prod[i,t] × P[i,t])', 'unit': 'Currency'},
                    {'name': 'Transport Cost', 'formula': 'Σ(C_trans[i,j,m,t] × X[i,j,m,t])', 'unit': 'Currency'},
                    {'name': 'Holding Cost', 'formula': 'Σ(C_hold[i] × I[i,t])', 'unit': 'Currency'}
                ]
            },
            'decision_variables': [
                {'symbol': 'P[i,t]', 'description': 'Production quantity at plant i in period t', 'unit': 'tons', 'domain': 'Continuous, ≥ 0'},
                {'symbol': 'X[i,j,m,t]', 'description': 'Quantity shipped from i to j via mode m in period t', 'unit': 'tons', 'domain': 'Continuous, ≥ 0'},
                {'symbol': 'T[i,j,m,t]', 'description': 'Number of trips from i to j via mode m in period t', 'unit': 'trips', 'domain': 'Integer, ≥ 0'},
                {'symbol': 'I[i,t]', 'description': 'Inventory level at plant i at end of period t', 'unit': 'tons', 'domain': 'Continuous, ≥ 0'}
            ],
            'constraints': [
                {
                    'name': 'Mass Balance',
                    'formula': 'I[i,t] = I[i,t-1] + P[i,t] + Σ(X[j,i,m,t]) - Σ(X[i,j,m,t]) - D[i,t]',
                    'description': 'Inventory balance ensuring flow continuity',
                    'scope': 'All plants i, all periods t'
                },
                {
                    'name': 'Shipment Capacity',
                    'formula': 'X[i,j,m,t] ≤ T[i,j,m,t] × Cap[m]',
                    'description': 'Quantity cannot exceed trip capacity',
                    'scope': 'All routes, modes, periods'
                },
                {
                    'name': 'Minimum Batch',
                    'formula': 'X[i,j,m,t] ≥ T[i,j,m,t] × SBQ[i,j]',
                    'description': 'Enforce minimum shipment batch quantity',
                    'scope': 'All routes, modes, periods'
                },
                {
                    'name': 'Inventory Bounds',
                    'formula': 'I_min[i] ≤ I[i,t] ≤ I_max[i]',
                    'description': 'Safety stock and capacity limits',
                    'scope': 'All plants i, all periods t'
                },
                {
                    'name': 'Production Capacity',
                    'formula': 'P[i,t] ≤ Cap_prod[i,t]',
                    'description': 'Production limited by plant capacity',
                    'scope': 'All production plants i, all periods t'
                }
            ],
            'indices': [
                {'symbol': 'i, j', 'description': 'Plant indices', 'set': 'Plants (IU ∪ GU)'},
                {'symbol': 'm', 'description': 'Transport mode', 'set': 'Modes {T1, T2, T3, ...}'},
                {'symbol': 't', 'description': 'Time period', 'set': 'Periods {1, 2, ..., T}'}
            ],
            'parameters': [
                {'symbol': 'C_prod[i]', 'description': 'Production cost per ton', 'source': 'ProductionCost sheet'},
                {'symbol': 'C_trans[i,j,m]', 'description': 'Transport cost per ton', 'source': 'LogisticsIUGU sheet'},
                {'symbol': 'C_hold[i]', 'description': 'Inventory holding cost', 'source': 'Calculated from inventory data'},
                {'symbol': 'Cap[m]', 'description': 'Vehicle capacity per trip', 'source': 'LogisticsIUGU sheet'},
                {'symbol': 'D[i,t]', 'description': 'Demand at plant i in period t', 'source': 'ClinkerDemand sheet'},
                {'symbol': 'I[i,0]', 'description': 'Initial inventory', 'source': 'IUGUOpeningStock sheet'}
            ]
        }
    }
    return model


# Health check
@router.get("/health")
async def health_check():
    """API health check"""
    return {
        'status': 'healthy',
        'service': 'Excel Optimization API',
        'data_loaded': _uploaded_data is not None
    }
