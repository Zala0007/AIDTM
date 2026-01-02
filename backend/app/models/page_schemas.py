"""
Page-wise schemas for the Master Prompt Implementation.
Implements strict separation between allocation and transportation layers.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime


# ==================== ENUMS ====================

class PlantType(str, Enum):
    """Plant classification."""
    IU = "IU"  # Integrated Unit
    GU = "GU"  # Grinding Unit


class TransportMode(str, Enum):
    """Transportation modes."""
    TRUCK = "truck"
    RAIL = "rail"
    SHIP = "ship"


class SafetyStockPolicy(str, Enum):
    """Safety stock management policies."""
    CONSERVATIVE = "conservative"      # High buffer
    BALANCED = "balanced"              # Medium buffer
    AGGRESSIVE = "aggressive"          # Low buffer


class PeriodType(str, Enum):
    """Planning period types."""
    WEEK = "week"
    MONTH = "month"


# ==================== PAGE 1: INDIA NETWORK OVERVIEW ====================

class PlantInfo(BaseModel):
    """Plant information for network overview."""
    plant_id: str = Field(..., description="Unique plant identifier")
    plant_name: str = Field(..., description="Plant name")
    plant_type: PlantType = Field(..., description="Type: IU or GU")
    state: str = Field(..., description="Indian state")
    region: str = Field(..., description="Region: North/West/South/East")
    location_lat: float = Field(..., description="Latitude coordinate")
    location_lon: float = Field(..., description="Longitude coordinate")
    company: Optional[str] = Field(None, description="Cement company name")
    capacity_tons: float = Field(..., description="Storage/production capacity (tons)")
    
    class Config:
        schema_extra = {
            "example": {
                "plant_id": "IU001",
                "plant_name": "Mumbai Integrated Unit",
                "plant_type": "IU",
                "state": "Maharashtra",
                "region": "West",
                "location_lat": 19.0760,
                "location_lon": 72.8777,
                "company": "UltraTech",
                "capacity_tons": 5000
            }
        }


class NetworkFilter(BaseModel):
    """Filters for network overview."""
    state: Optional[str] = None
    region: Optional[str] = None
    company: Optional[str] = None
    plant_types: List[PlantType] = Field(default=["IU", "GU"])


class Page1Response(BaseModel):
    """Response for Page 1: India Network Overview."""
    all_plants: List[PlantInfo]
    total_ius: int
    total_gus: int
    total_plants: int
    selected_plant_ids: List[str] = Field(default=[], description="User-selected plants")
    selected_plants: List[PlantInfo] = Field(default=[])
    kpis: Dict[str, Any] = Field(
        default={
            "total_ius_india": 150,
            "total_gus_india": 270,
            "total_plants_india": 420,
            "selected_ius_count": 0,
            "selected_gus_count": 0,
            "selected_plants_count": 0
        }
    )


# ==================== PAGE 2: DEMAND & PRODUCTION ====================

class DemandInput(BaseModel):
    """Demand specification."""
    plant_id: str = Field(..., description="Plant ID (GU or IU)")
    period: int = Field(..., ge=1, description="Planning period")
    demand_tons: float = Field(..., ge=0, description="Demand in tons")


class DemandTable(BaseModel):
    """Demand table with period info."""
    period_type: PeriodType = Field(..., description="Week or Month")
    demands: List[DemandInput]
    demand_multiplier: float = Field(default=1.0, ge=0.8, le=1.3, description="Global demand multiplier")


class ProductionCapacity(BaseModel):
    """Production capacity at IU."""
    iu_id: str = Field(..., description="IU identifier")
    period: int = Field(..., ge=1, description="Planning period")
    max_production_tons: float = Field(..., ge=0, description="Max production (tons)")
    variable_cost_per_ton: float = Field(..., ge=0, description="Production cost ($/ton)")


class InventorySetup(BaseModel):
    """Initial inventory configuration."""
    plant_id: str = Field(..., description="Plant ID")
    initial_inventory_tons: float = Field(..., ge=0, description="Starting inventory (tons)")
    safety_stock_policy: SafetyStockPolicy = Field(..., description="Conservative/Balanced/Aggressive")


class Page2Request(BaseModel):
    """Request for Page 2: Demand & Production Input."""
    selected_ius: List[str] = Field(..., min_items=1, description="Selected IU IDs from Page 1")
    selected_gus: List[str] = Field(..., min_items=1, description="Selected GU IDs from Page 1")
    demand_table: DemandTable
    production_capacities: List[ProductionCapacity]
    inventory_setups: List[InventorySetup]


class Page2Response(BaseModel):
    """Response for Page 2: Demand & Production Summary."""
    selected_ius_info: List[PlantInfo]
    selected_gus_info: List[PlantInfo]
    total_demand_tons: float
    total_production_capacity_tons: float
    total_initial_inventory_tons: float
    period_type: PeriodType
    num_periods: int
    safety_stock_policies: Dict[str, SafetyStockPolicy]
    validation: Dict[str, Any] = Field(
        default={
            "production_sufficient": True,
            "warnings": []
        }
    )


# ==================== PAGE 3: ALLOCATION ENGINE ====================

class AllocationInput(BaseModel):
    """Allocation optimization input."""
    source_iu_id: str = Field(..., description="Source IU")
    destination_ids: List[str] = Field(..., min_items=1, description="Destination IU/GU IDs")
    show_all_allocations: bool = Field(default=False, description="Show all routes or selected only")


class AllocationRoute(BaseModel):
    """Allocation route result."""
    from_plant_id: str
    to_plant_id: str
    period: int
    quantity_tons: float
    type: str = Field(description="IU→IU or IU→GU")


class AllocationMatrix(BaseModel):
    """Matrix of allocations."""
    source_plant_id: str
    destination_plant_id: str
    total_quantity_tons: float
    periods: Dict[int, float] = Field(description="Quantity per period")


class InventoryTrend(BaseModel):
    """Inventory level over time."""
    plant_id: str
    period: int
    inventory_tons: float
    safety_stock_tons: float
    max_capacity_tons: float
    utilization_percent: float


class Page3Response(BaseModel):
    """Response for Page 3: Allocation Results."""
    allocation_routes: List[AllocationRoute]
    allocation_matrices: List[AllocationMatrix]
    inventory_trends: List[InventoryTrend]
    kpis: Dict[str, Any] = Field(
        default={
            "demand_fulfillment_percent": 100.0,
            "safety_stock_compliance": True,
            "allocation_cost_dollars": 0.0,
            "production_cost_dollars": 0.0,
            "inventory_cost_dollars": 0.0,
            "total_cost_dollars": 0.0
        }
    )
    production_utilization: Dict[str, float] = Field(description="IU → utilization %")
    solve_time_seconds: float


# ==================== PAGE 4: TRANSPORTATION INPUTS ====================

class TransportModeConfig(BaseModel):
    """Transport mode configuration."""
    mode_id: str = Field(..., description="truck/rail/ship")
    mode_name: str
    capacity_tons_per_trip: float
    min_shipment_batch_tons: float = Field(..., description="SBQ")
    fixed_cost_per_trip: float
    variable_cost_per_ton: float
    editable: bool = Field(default=False, description="Can edit in advanced settings")


class TransportationInput(BaseModel):
    """Transportation input setup."""
    source_iu_id: str = Field(..., description="Single source IU")
    destination_ids: List[str] = Field(..., min_items=1, description="Multiple destinations")
    available_modes: List[TransportModeConfig]
    consolidation_enabled: bool = Field(default=True)
    transport_cost_index: float = Field(default=1.0, ge=0.5, le=1.5, description="Cost multiplier")


class Page4Response(BaseModel):
    """Response for Page 4: Transportation Mode Availability."""
    source_iu: PlantInfo
    destinations: List[PlantInfo]
    transport_modes: List[TransportModeConfig]
    consolidation_enabled: bool
    cost_index: float
    available_routes: int = Field(description="Number of possible origin-destination-mode combinations")


# ==================== PAGE 5: TRANSPORTATION OPTIMIZATION ====================

class TransportationOptimizationInput(BaseModel):
    """Input for transportation optimization."""
    source_iu_id: str = Field(..., description="Source IU")
    destination_ids: List[str] = Field(..., min_items=1, description="Destinations (multi-select)")
    selected_modes: List[str] = Field(default=["truck", "rail", "ship"], description="Enabled transport modes")
    period: Optional[int] = None
    consolidation_enabled: bool = Field(default=True)


class TransportRoute(BaseModel):
    """Single transport route solution."""
    source_plant_id: str
    destination_plant_id: str
    transport_mode: str
    period: int
    quantity_tons: float
    num_trips: int
    shared_route: bool = Field(description="Part of consolidation")
    transport_cost_dollars: float


class ConsolidationBenefit(BaseModel):
    """Consolidation insight."""
    route_segment: str = Field(description="Description of consolidated segment")
    destinations_served: int
    trips_without_consolidation: int
    trips_with_consolidation: int
    fixed_cost_saved_dollars: float
    variable_cost_saved_dollars: float


class Page5Response(BaseModel):
    """Response for Page 5: Transportation Optimization."""
    source_iu: PlantInfo
    destinations: List[PlantInfo]
    routes: List[TransportRoute]
    consolidation_benefits: List[ConsolidationBenefit] = Field(default=[])
    kpis: Dict[str, Any] = Field(
        default={
            "total_transport_cost_dollars": 0.0,
            "total_destinations_served": 0,
            "total_trips_required": 0,
            "trips_saved_from_consolidation": 0,
            "vehicle_utilization_percent": 0.0,
            "consolidation_enabled": True
        }
    )
    solve_time_seconds: float


# ==================== PAGE 6: MAP VISUALIZATION ====================

class MapNode(BaseModel):
    """Node on map (plant)."""
    plant_id: str
    plant_name: str
    plant_type: PlantType
    location_lat: float
    location_lon: float
    node_size: float = Field(description="Visualization size based on capacity")


class MapRoute(BaseModel):
    """Route on map."""
    source_plant_id: str
    destination_plant_id: str
    transport_mode: str
    quantity_tons: float
    is_shared: bool = Field(description="Is this part of consolidated shipment")
    route_color: str = Field(description="Hex color by mode")
    line_thickness: float = Field(description="Proportional to quantity")


class Page6Response(BaseModel):
    """Response for Page 6: Map Visualization."""
    nodes: List[MapNode]
    routes: List[MapRoute]
    source_iu_id: str
    period: Optional[int] = None
    consolidation_visible: bool
    animations_enabled: bool = True


# ==================== PAGE 7: COST & INVENTORY SUMMARY ====================

class CostBreakdownPerPlant(BaseModel):
    """Detailed cost breakdown for one plant."""
    production_cost_dollars: float = Field(description="Cost to produce (IU only)")
    transport_cost_incoming_dollars: float = Field(description="Cost of inbound shipments")
    transport_cost_outgoing_dollars: float = Field(description="Cost of outbound shipments")
    inventory_holding_cost_dollars: float = Field(description="Inventory holding cost")
    total_cost_dollars: float


class InventoryCompliance(BaseModel):
    """Inventory safety stock compliance."""
    plant_id: str
    current_inventory_tons: float
    safety_stock_required_tons: float
    compliant: bool = Field(description="Safety stock maintained")
    risk_indicator: str = Field(description="Safe/Warning/Critical")
    periods_at_risk: int


class Page7Response(BaseModel):
    """Response for Page 7: Cost & Inventory Summary."""
    selected_plant_id: str
    selected_plant: PlantInfo
    cost_breakdown: CostBreakdownPerPlant
    inventory_compliance: InventoryCompliance
    inventory_trend: List[InventoryTrend]
    comparisons: Dict[str, Any] = Field(
        default={
            "with_consolidation_cost": 0.0,
            "without_consolidation_cost": 0.0,
            "consolidation_savings": 0.0
        }
    )


# ==================== PAGE 8: DEMAND UNCERTAINTY ====================

class ScenarioDefinition(BaseModel):
    """Scenario for uncertainty analysis."""
    scenario_name: str = Field(..., description="Low/Base/High or custom")
    demand_multiplier: float = Field(description="Demand scaling factor")
    probability: float = Field(default=0.33, ge=0, le=1, description="Scenario probability")


class UncertaintyCostResult(BaseModel):
    """Cost result under scenario."""
    scenario_name: str
    total_cost_dollars: float
    transport_cost_dollars: float
    inventory_cost_dollars: float


class Page8Response(BaseModel):
    """Response for Page 8: Demand Uncertainty Analysis."""
    selected_plant_id: Optional[str] = None
    scenarios: List[ScenarioDefinition]
    cost_results: List[UncertaintyCostResult]
    expected_cost_dollars: float = Field(description="Probability-weighted cost")
    worst_case_cost_dollars: float
    best_case_cost_dollars: float
    robustness_required_inventory_increase_percent: float = Field(description="Buffer needed for uncertainty")
    solve_time_seconds: float


# ==================== UTILITY MODELS ====================

class BatchOptimizationRequest(BaseModel):
    """Request to run full optimization pipeline."""
    scenario_name: str
    page1_selection: Page1Response
    page2_input: Page2Request
    page3_allocation_input: AllocationInput
    page4_transportation_input: TransportationInput
    page5_optimization_input: TransportationOptimizationInput
    run_uncertainty_analysis: bool = False


class OptimizationStatus(BaseModel):
    """Overall optimization status."""
    scenario_name: str
    status: str = Field(description="pending/running/completed/failed")
    page1_complete: bool = False
    page2_complete: bool = False
    page3_complete: bool = False
    page4_complete: bool = False
    page5_complete: bool = False
    page7_complete: bool = False
    page8_complete: bool = False
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ExportRequest(BaseModel):
    """Request to export results."""
    scenario_id: str
    format: str = Field(description="excel/pdf/json")
    include_pages: List[int] = Field(description="Page numbers to include")


class ExportResponse(BaseModel):
    """Export response."""
    file_path: str
    file_size_mb: float
    format: str
    generated_at: datetime
