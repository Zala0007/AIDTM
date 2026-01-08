"""
Excel data parser for Advanced Optimization Platform
Handles Excel file parsing with multiple sheets for supply chain data
"""
import pandas as pd
from typing import Dict, List, Optional, Any
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


class ExcelDataParser:
    """Parser for Excel files containing supply chain data"""
    
    REQUIRED_SHEETS = [
        'IUGUType',
        'IUGUOpeningStock',
        'IUGUClosingStock',
        'ProductionCost',
        'ClinkerCapacity',
        'ClinkerDemand',
        'LogisticsIUGU'
    ]
    
    OPTIONAL_SHEETS = [
        'IUGUConstraint',
        'TransportModes'
    ]
    
    def __init__(self, file_content: bytes):
        """Initialize parser with Excel file content"""
        self.file_content = file_content
        self.data: Dict[str, pd.DataFrame] = {}
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
    def parse(self) -> Dict[str, Any]:
        """Parse Excel file and return structured data"""
        try:
            # Read Excel file
            excel_file = pd.ExcelFile(BytesIO(self.file_content))
            available_sheets = excel_file.sheet_names
            
            logger.info(f"Found sheets: {available_sheets}")
            
            # Check for required sheets
            missing_sheets = [s for s in self.REQUIRED_SHEETS if s not in available_sheets]
            if missing_sheets:
                self.errors.append(f"Missing required sheets: {', '.join(missing_sheets)}")
                return self._error_response()
            
            # Parse all sheets
            for sheet_name in available_sheets:
                try:
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    self.data[sheet_name] = df
                    logger.info(f"Parsed sheet '{sheet_name}': {len(df)} rows")
                except Exception as e:
                    self.errors.append(f"Error parsing sheet '{sheet_name}': {str(e)}")
            
            if self.errors:
                return self._error_response()
            
            # Validate data structure
            self._validate_data()
            
            if self.errors:
                return self._error_response()
            
            # Extract metadata
            metadata = self._extract_metadata()
            
            return {
                'success': True,
                'data': self._serialize_data(),
                'metadata': metadata,
                'warnings': self.warnings
            }
            
        except Exception as e:
            logger.error(f"Excel parsing error: {str(e)}")
            self.errors.append(f"Failed to parse Excel file: {str(e)}")
            return self._error_response()
    
    def _validate_data(self):
        """Validate data structure and relationships"""
        try:
            # Validate IUGUType
            if 'IUGUType' in self.data:
                df = self.data['IUGUType']
                required_cols = ['IU CODE', 'GU CODE']
                missing = [c for c in required_cols if c not in df.columns]
                if missing:
                    self.errors.append(f"IUGUType missing columns: {', '.join(missing)}")
            
            # Validate Opening Stock
            if 'IUGUOpeningStock' in self.data:
                df = self.data['IUGUOpeningStock']
                required_cols = ['IUGU CODE', 'OPENING STOCK']
                missing = [c for c in required_cols if c not in df.columns]
                if missing:
                    self.errors.append(f"IUGUOpeningStock missing columns: {', '.join(missing)}")
            
            # Validate Logistics
            if 'LogisticsIUGU' in self.data:
                df = self.data['LogisticsIUGU']
                required_cols = ['IU CODE', 'GU CODE', 'TRANSPORT CODE']
                missing = [c for c in required_cols if c not in df.columns]
                if missing:
                    self.errors.append(f"LogisticsIUGU missing columns: {', '.join(missing)}")
            
            # Check for data consistency
            if 'IUGUType' in self.data and 'LogisticsIUGU' in self.data:
                iugu_codes = set(self.data['IUGUType'].apply(
                    lambda row: f"{row['IU CODE']}_{row['GU CODE']}", axis=1
                ).unique())
                logistics_codes = set(self.data['LogisticsIUGU'].apply(
                    lambda row: f"{row['IU CODE']}_{row['GU CODE']}", axis=1
                ).unique())
                
                missing_logistics = iugu_codes - logistics_codes
                if missing_logistics and len(missing_logistics) < 10:
                    self.warnings.append(f"Some IUGU pairs lack logistics data: {len(missing_logistics)} pairs")
                    
        except Exception as e:
            self.errors.append(f"Validation error: {str(e)}")
    
    def _extract_metadata(self) -> Dict[str, Any]:
        """Extract metadata from parsed data"""
        metadata = {
            'sheets': list(self.data.keys()),
            'total_routes': 0,
            'total_plants': 0,
            'periods': []
        }
        
        try:
            # Count unique plants
            if 'IUGUType' in self.data:
                df = self.data['IUGUType']
                iu_plants = df['IU CODE'].unique() if 'IU CODE' in df.columns else []
                gu_plants = df['GU CODE'].unique() if 'GU CODE' in df.columns else []
                metadata['total_plants'] = len(set(list(iu_plants) + list(gu_plants)))
            
            # Count routes
            if 'LogisticsIUGU' in self.data:
                metadata['total_routes'] = len(self.data['LogisticsIUGU'])
            
            # Extract periods
            if 'ClinkerDemand' in self.data:
                df = self.data['ClinkerDemand']
                period_cols = [c for c in df.columns if c.startswith('T') or 'PERIOD' in c.upper()]
                metadata['periods'] = period_cols[:12]  # Limit to 12 periods
                
        except Exception as e:
            logger.warning(f"Metadata extraction warning: {str(e)}")
        
        return metadata
    
    def _serialize_data(self) -> Dict[str, Any]:
        """Serialize DataFrames for JSON response"""
        serialized = {}
        for sheet_name, df in self.data.items():
            # Convert to records, limiting size
            records = df.head(100).to_dict('records')  # Limit to first 100 rows for response
            serialized[sheet_name] = {
                'columns': list(df.columns),
                'row_count': len(df),
                'preview': records
            }
        return serialized
    
    def _error_response(self) -> Dict[str, Any]:
        """Generate error response"""
        return {
            'success': False,
            'errors': self.errors,
            'warnings': self.warnings
        }
    
    def get_sources(self) -> List[str]:
        """Extract unique source plants (IU codes)"""
        if 'IUGUType' not in self.data:
            return []
        df = self.data['IUGUType']
        if 'IU CODE' not in df.columns:
            return []
        return sorted(df['IU CODE'].unique().tolist())
    
    def get_destinations(self, source: str) -> List[str]:
        """Get destinations for a specific source"""
        if 'IUGUType' not in self.data:
            return []
        df = self.data['IUGUType']
        if 'IU CODE' not in df.columns or 'GU CODE' not in df.columns:
            return []
        filtered = df[df['IU CODE'] == source]
        return sorted(filtered['GU CODE'].unique().tolist())
    
    def get_modes(self, source: str, destination: str) -> List[Dict[str, Any]]:
        """Get transport modes for a specific route"""
        if 'LogisticsIUGU' not in self.data:
            return []
        df = self.data['LogisticsIUGU']
        if 'IU CODE' not in df.columns or 'GU CODE' not in df.columns:
            return []
        
        filtered = df[(df['IU CODE'] == source) & (df['GU CODE'] == destination)]
        
        modes = []
        for _, row in filtered.iterrows():
            mode_code = row.get('TRANSPORT CODE', 'Unknown')
            capacity = row.get('VEHICLE CAPACITY', row.get('CAPACITY', 'N/A'))
            modes.append({
                'code': str(mode_code),
                'name': f"Mode {mode_code}",
                'vehicle_capacity': capacity
            })
        
        return modes
    
    def get_periods(self) -> List[str]:
        """Extract available time periods"""
        if 'ClinkerDemand' not in self.data:
            return []
        df = self.data['ClinkerDemand']
        period_cols = [c for c in df.columns if c.startswith('T') or 'PERIOD' in c.upper()]
        return period_cols[:12]
    
    def get_route_data(self, source: str, destination: str, mode: str, period: str) -> Dict[str, Any]:
        """Get comprehensive route data for analysis"""
        route_data = {
            'source': source,
            'destination': destination,
            'mode': mode,
            'period': period,
            'data_completeness': {
                'logistics': False,
                'capacity': False,
                'demand': False,
                'costs': False,
                'inventory': False,
                'constraints': False
            }
        }
        
        try:
            # Get logistics data
            if 'LogisticsIUGU' in self.data:
                logistics_df = self.data['LogisticsIUGU']
                route_logistics = logistics_df[
                    (logistics_df['IU CODE'] == source) &
                    (logistics_df['GU CODE'] == destination) &
                    (logistics_df['TRANSPORT CODE'] == mode)
                ]
                
                if not route_logistics.empty:
                    row = route_logistics.iloc[0]
                    route_data['freight_cost'] = row.get('FREIGHT', 'N/A')
                    route_data['handling_cost'] = row.get('HANDLING', 'N/A')
                    route_data['transport_capacity'] = row.get('VEHICLE CAPACITY', 'N/A')
                    route_data['data_completeness']['logistics'] = True
            
            # Get capacity data
            if 'ClinkerCapacity' in self.data:
                capacity_df = self.data['ClinkerCapacity']
                source_capacity = capacity_df[capacity_df.iloc[:, 0] == source]
                if not source_capacity.empty:
                    route_data['source_capacity'] = source_capacity.iloc[0, 1] if len(source_capacity.columns) > 1 else 'N/A'
                    route_data['data_completeness']['capacity'] = True
            
            # Get demand data
            if 'ClinkerDemand' in self.data:
                demand_df = self.data['ClinkerDemand']
                dest_demand = demand_df[demand_df.iloc[:, 0] == destination]
                if not dest_demand.empty and period in demand_df.columns:
                    route_data['destination_demand'] = dest_demand[period].iloc[0]
                    route_data['data_completeness']['demand'] = True
            
            # Get production cost
            if 'ProductionCost' in self.data:
                cost_df = self.data['ProductionCost']
                source_cost = cost_df[cost_df.iloc[:, 0] == source]
                if not source_cost.empty:
                    route_data['production_cost'] = source_cost.iloc[0, 1] if len(source_cost.columns) > 1 else 'N/A'
                    route_data['data_completeness']['costs'] = True
            
            # Get inventory data
            if 'IUGUOpeningStock' in self.data:
                opening_df = self.data['IUGUOpeningStock']
                iugu_code = f"{source}_{destination}"
                opening_stock = opening_df[opening_df['IUGU CODE'] == iugu_code]
                if not opening_stock.empty:
                    route_data['source_opening_stock'] = opening_stock['OPENING STOCK'].iloc[0]
                    route_data['data_completeness']['inventory'] = True
            
            # Calculate derived metrics
            route_data['advanced_metrics'] = self._calculate_metrics(route_data)
            
        except Exception as e:
            logger.error(f"Error getting route data: {str(e)}")
        
        return route_data
    
    def _calculate_metrics(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate advanced metrics for route"""
        metrics = {
            'cost_per_trip': 0,
            'capacity_utilization_pct': 0,
            'load_efficiency_pct': 0,
            'recommended_quantity': 0,
            'recommended_trips': 0,
            'potential_savings': 0
        }
        
        try:
            # Calculate cost per trip
            freight = route_data.get('freight_cost', 0)
            if isinstance(freight, (int, float)):
                metrics['cost_per_trip'] = freight
            
            # Calculate capacity utilization
            capacity = route_data.get('transport_capacity', 0)
            demand = route_data.get('destination_demand', 0)
            if isinstance(capacity, (int, float)) and isinstance(demand, (int, float)) and capacity > 0:
                metrics['recommended_trips'] = int(demand / capacity) + (1 if demand % capacity > 0 else 0)
                metrics['capacity_utilization_pct'] = (demand / (metrics['recommended_trips'] * capacity)) * 100
                metrics['load_efficiency_pct'] = metrics['capacity_utilization_pct']
                metrics['recommended_quantity'] = demand
                
        except Exception as e:
            logger.warning(f"Metrics calculation warning: {str(e)}")
        
        return metrics


def parse_excel_file(file_content: bytes) -> Dict[str, Any]:
    """Parse Excel file and return structured data"""
    parser = ExcelDataParser(file_content)
    return parser.parse()
