from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator
from pydantic import ConfigDict


PlantType = Literal["IU", "GU"]


class Plant(BaseModel):
    """A plant node in the network.

    Inventory is tracked at every plant across periods.
    Production is allowed only for IUs.
    """

    id: str = Field(..., min_length=1)
    name: Optional[str] = None
    type: PlantType

    initial_inventory: float = Field(..., ge=0)
    max_capacity: float = Field(..., gt=0)
    safety_stock: float = Field(..., ge=0)

    # Costs
    holding_cost: float = Field(0.0, ge=0, description="Inventory holding cost per unit per period")
    production_cost: float = Field(
        0.0,
        ge=0,
        description="Production cost per unit (only used for IUs)",
    )

    # Optional operational bounds
    max_production_per_period: Optional[float] = Field(
        None, gt=0, description="Optional upper bound on production per period (IUs only)"
    )

    @model_validator(mode="after")
    def _validate_caps(self) -> "Plant":
        if self.safety_stock > self.max_capacity:
            raise ValueError("safety_stock cannot exceed max_capacity")
        if self.initial_inventory > self.max_capacity:
            raise ValueError("initial_inventory cannot exceed max_capacity")
        return self


class RouteMode(BaseModel):
    """A transport mode option on a route."""

    mode: str = Field(..., min_length=1, description="e.g., 'road', 'rail'")
    unit_cost: float = Field(..., ge=0, description="Cost per unit shipped")
    capacity_per_trip: float = Field(..., gt=0, description="Units per trip (vehicle/train capacity)")


class TransportationRoute(BaseModel):
    """Directed route from origin -> destination."""

    id: str = Field(..., min_length=1)
    origin_id: str = Field(..., min_length=1)
    destination_id: str = Field(..., min_length=1)

    minimum_shipment_batch_quantity: float = Field(
        0.0,
        ge=0,
        description="SBQ. If trips>0, average shipment per trip must be >= SBQ.",
    )

    modes: List[RouteMode] = Field(..., min_length=1)


class OptimizationRequest(BaseModel):
    """Full optimization input.

    Demand is specified per-plant per-period.
    For the requested T periods, demand[plant_id] must have length T.
    """

    T: int = Field(4, ge=1, le=52, description="Number of periods (default 4)")

    plants: List[Plant] = Field(..., min_length=1)
    routes: List[TransportationRoute] = Field(..., min_length=0)

    # demand[plant_id] = [d_1, d_2, ..., d_T]
    demand: Dict[str, List[float]] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_network(self) -> "OptimizationRequest":
        plant_ids = {p.id for p in self.plants}
        if len(plant_ids) != len(self.plants):
            raise ValueError("Duplicate plant ids found")

        # Validate demand lengths and non-negative demand
        for plant_id, series in self.demand.items():
            if plant_id not in plant_ids:
                raise ValueError(f"Demand specified for unknown plant '{plant_id}'")
            if len(series) != self.T:
                raise ValueError(f"Demand for plant '{plant_id}' must have length T={self.T}")
            if any(d < 0 for d in series):
                raise ValueError(f"Demand for plant '{plant_id}' contains negative values")

        # Validate routes refer to known plants
        for r in self.routes:
            if r.origin_id not in plant_ids:
                raise ValueError(f"Route '{r.id}' has unknown origin_id '{r.origin_id}'")
            if r.destination_id not in plant_ids:
                raise ValueError(
                    f"Route '{r.id}' has unknown destination_id '{r.destination_id}'"
                )
            if r.origin_id == r.destination_id:
                raise ValueError(f"Route '{r.id}' origin_id equals destination_id")

        # Simple business rule: only allow shipments out of IUs (optional, but typical)
        plants_by_id = {p.id: p for p in self.plants}
        for r in self.routes:
            if plants_by_id[r.origin_id].type != "IU":
                raise ValueError(
                    f"Route '{r.id}' origin '{r.origin_id}' must be an IU to ship clinker"
                )

        return self


class ScheduledTrip(BaseModel):
    period: int = Field(..., ge=1)
    route_id: str
    origin_id: str
    destination_id: str
    mode: str
    num_trips: int = Field(..., ge=0)
    quantity_shipped: float = Field(..., ge=0)


class OptimizationResponse(BaseModel):
    status: Literal["Optimal", "Infeasible", "Unbounded", "Not Solved", "Error"]
    total_cost: Optional[float] = None
    scheduled_trips: List[ScheduledTrip] = Field(default_factory=list)
    message: Optional[str] = None


class ConstraintRow(BaseModel):
    """Row from IUGUConstraint.csv or JSON payload.

    bound_type: L (>=), U (<=), E (=)
    transport_code and iugu_code may be blank depending on scope (IU / mode / route).
    """

    iu_code: str = Field(..., min_length=1, description="Origin IU code")
    transport_code: Optional[str] = Field(None, description="Mode code, e.g., T1/T2")
    iugu_code: Optional[str] = Field(None, description="Destination IU/GU code")
    time_period: int = Field(..., ge=1, description="1-based time period index")
    bound_type: Literal['L', 'U', 'E', 'G'] = Field(..., description="L>=, U<=, E= (G treated as L)")
    value_type: Optional[str] = Field(None, description="Optional value type flag from CSV")
    value: float = Field(..., ge=0)

    @model_validator(mode="after")
    def _trim_codes(self) -> "ConstraintRow":
        self.iu_code = self.iu_code.strip()
        if self.transport_code:
            self.transport_code = self.transport_code.strip()
        if self.iugu_code:
            self.iugu_code = self.iugu_code.strip()
        # Normalize legacy 'G' to 'L'
        if self.bound_type == 'G':
            self.bound_type = 'L'
        return self


class ConstraintOptimizationRequest(OptimizationRequest):
    """Optimization request with optional constraint rows."""

    constraints: List[ConstraintRow] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# CSV-backed schemas (pydantic v2) for clinker supply chain inputs
# ---------------------------------------------------------------------------


class _CSVBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class IUGUTypeRow(_CSVBase):
    iugu_code: str = Field(..., alias="IUGU CODE")
    plant_type: str = Field(..., alias="PLANT TYPE")
    source: Optional[float] = Field(None, alias="# Source")


class IUGUClosingStockRow(_CSVBase):
    iugu_code: str = Field(..., alias="IUGU CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    min_close_stock: float = Field(..., alias="MIN CLOSE STOCK")
    max_close_stock: Optional[float] = Field(None, alias="MAX CLOSE STOCK")


class IUGUOpeningStockRow(_CSVBase):
    iugu_code: str = Field(..., alias="IUGU CODE")
    opening_stock: float = Field(..., alias="OPENING STOCK")


class HubOpeningStockRow(_CSVBase):
    iu: str = Field(..., alias="IU")
    iugu: str = Field(..., alias="IUGU")
    opening_stock: float = Field(..., alias="Opening Stock")


class IUGUConstraintRow(_CSVBase):
    iu_code: str = Field(..., alias="IU CODE")
    transport_code: Optional[str] = Field(None, alias="TRANSPORT CODE")
    iugu_code: Optional[str] = Field(None, alias="IUGU CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    bound_typeid: str = Field(..., alias="BOUND TYPEID")
    value_typeid: str = Field(..., alias="VALUE TYPEID")
    value: float = Field(..., alias="Value")


class LogisticsIUGURow(_CSVBase):
    from_iu_code: str = Field(..., alias="FROM IU CODE")
    to_iugu_code: str = Field(..., alias="TO IUGU CODE")
    transport_code: str = Field(..., alias="TRANSPORT CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    freight_cost: float = Field(..., alias="FREIGHT COST")
    handling_cost: float = Field(..., alias="HANDLING COST")
    quantity_multiplier: float = Field(..., alias="QUANTITY MULTIPLIER")


class ProductionCostRow(_CSVBase):
    iu_code: str = Field(..., alias="IU CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    production_cost: float = Field(..., alias="PRODUCTION COST")


class ClinkerCapacityRow(_CSVBase):
    iu_code: str = Field(..., alias="IU CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    capacity: float = Field(..., alias="CAPACITY")


class ClinkerDemandRow(_CSVBase):
    iugu_code: str = Field(..., alias="IUGU CODE")
    time_period: int = Field(..., alias="TIME PERIOD")
    demand: float = Field(..., alias="DEMAND")
    min_fulfillment_pct: Optional[float] = Field(None, alias="MIN FULFILLMENT (%)")


class OptimizationInput(_CSVBase):
    iugu_type: List[IUGUTypeRow] = Field(default_factory=list)
    iugu_closing_stock: List[IUGUClosingStockRow] = Field(default_factory=list)
    iugu_opening_stock: List[IUGUOpeningStockRow] = Field(default_factory=list)
    hub_opening_stock: List[HubOpeningStockRow] = Field(default_factory=list)
    iugu_constraints: List[IUGUConstraintRow] = Field(default_factory=list)
    logistics_iugu: List[LogisticsIUGURow] = Field(default_factory=list)
    production_cost: List[ProductionCostRow] = Field(default_factory=list)
    clinker_capacity: List[ClinkerCapacityRow] = Field(default_factory=list)
    clinker_demand: List[ClinkerDemandRow] = Field(default_factory=list)
