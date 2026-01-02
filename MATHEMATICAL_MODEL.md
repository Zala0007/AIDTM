# Mathematical Model Documentation

## Overview

This document describes the mathematical formulations and algorithms used in the Clinker Supply Chain Optimization Decision Support System. The system employs **dynamic calculation models** based on operational research principles to optimize production, allocation, and transportation decisions.

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Decision Variables](#decision-variables)
3. [Allocation Model (Page 3)](#allocation-model-page-3)
4. [Transportation Model (Page 5)](#transportation-model-page-5)
5. [Cost Calculations](#cost-calculations)
6. [Inventory Management](#inventory-management)
7. [Uncertainty Analysis (Page 8)](#uncertainty-analysis-page-8)
8. [Algorithm Complexity](#algorithm-complexity)

---

## Problem Statement

### Business Context

Optimize the production and distribution of **clinker** across:
- **I** Integrated Units (IUs) - producing plants
- **J** Grinding Units (GUs) - consuming plants
- **T** time periods (weeks/months)

### Objectives

1. **Minimize Total Cost** = Production Cost + Transportation Cost + Inventory Cost
2. **Meet Demand** at all GUs in all periods
3. **Respect Capacity** constraints at all plants
4. **Maintain Safety Stock** for operational resilience
5. **Optimize Mode Selection** for transportation

---

## Decision Variables

### Notation

#### Sets
- $I$ = Set of Integrated Units (IUs)
- $J$ = Set of all plants (IUs ∪ GUs)
- $T$ = Set of time periods {1, 2, ..., T}
- $M$ = Set of transportation modes {truck, rail, ship}

#### Parameters
- $C_i$ = Production capacity of IU $i$ (tons/period)
- $D_{jt}$ = Demand at plant $j$ in period $t$ (tons)
- $I_{j0}$ = Initial inventory at plant $j$ (tons)
- $SS_j$ = Safety stock requirement at plant $j$ (tons)
- $d_{ij}$ = Distance between plant $i$ and plant $j$ (km)

#### Cost Parameters
- $c^{prod}$ = Variable production cost ($/ton) = $45
- $c^{setup}$ = Route setup cost ($) = $2,500
- $c^{hold}$ = Inventory holding cost ($/ton/period) = $0.50
- $c^{mode}_m$ = Fixed cost per trip for mode $m$
  - Truck: $500
  - Rail: $1,500
  - Ship: $15,000
- $v^{mode}_m$ = Variable cost per ton-km for mode $m$
  - Truck: $2.50
  - Rail: $1.20
  - Ship: $0.80

#### Mode Parameters
- $K_m$ = Capacity per trip for mode $m$ (tons)
  - Truck: 20
  - Rail: 60
  - Ship: 5,000

---

## Allocation Model (Page 3)

### Objective

Determine **how much clinker** to allocate from each IU to each destination plant to minimize total costs.

### Current Implementation: Proportional Allocation

The system uses a **proportional allocation heuristic** based on destination capacities:

#### Step 1: Calculate Total Destination Capacity

$$\text{TotalCapacity} = \sum_{j \in J_{dest}} C_j$$

where $J_{dest}$ is the set of selected destination plants.

#### Step 2: Calculate Source Capacity

$$\text{SourceCapacity} = 0.85 \times C_{source}$$

This assumes 85% utilization of the source IU's capacity.

#### Step 3: Proportional Allocation

For each destination $j$:

$$Q_{ij} = \left\lfloor \text{SourceCapacity} \times \frac{C_j}{\text{TotalCapacity}} \right\rfloor$$

where:
- $Q_{ij}$ = Quantity allocated from source $i$ to destination $j$
- $\lfloor \cdot \rfloor$ = Floor function (rounding down)

### Inventory Dynamics

For each plant $j$ and period $t$:

$$I_{jt} = I_{j,t-1} + \sum_{i \in I} Q_{ijt} - D_{jt}$$

where:
- $I_{jt}$ = Inventory at plant $j$ at end of period $t$
- $I_{j,t-1}$ = Inventory from previous period
- $Q_{ijt}$ = Quantity received from IU $i$ in period $t$
- $D_{jt}$ = Demand satisfied in period $t$

### Safety Stock Constraint

$$I_{jt} \geq SS_j = 0.15 \times C_j \quad \forall j \in J, t \in T$$

Safety stock is set at 15% of plant capacity.

### Initial Inventory

$$I_{j0} = 0.25 \times C_j$$

Initial inventory starts at 25% of plant capacity.

### Cost Components

#### Production Cost

$$\text{ProductionCost} = \sum_{i \in I} \sum_{j \in J} Q_{ij} \times c^{prod}$$

$$= Q_{total} \times 45$$

#### Allocation Setup Cost

$$\text{AllocationCost} = |\{(i,j) : Q_{ij} > 0\}| \times c^{setup}$$

$$= N_{routes} \times 2,500$$

#### Inventory Holding Cost

$$\text{InventoryCost} = \sum_{j \in J} \sum_{t \in T} I_{jt} \times c^{hold}$$

---

## Transportation Model (Page 5)

### Objective

Determine **which transportation mode** and **how many trips** are needed for each route to minimize transportation costs.

### Mode Selection Algorithm

For each route $(i,j)$:

#### Step 1: Calculate Distance

$$d_{ij} = 111 \times \sqrt{(\text{lat}_j - \text{lat}_i)^2 + (\text{lon}_j - \text{lon}_i)^2}$$

where:
- $111$ converts degrees to kilometers (approximate)
- $\text{lat}_i, \text{lon}_i$ = Coordinates of plant $i$

#### Step 2: Mode Selection Logic

```python
if distance > 400 km:
    mode = ship (if available)
elif distance > 200 km:
    mode = rail (if available)
else:
    mode = truck (if available)
```

If preferred mode unavailable, select next available mode.

### Trip Calculation

For route $(i,j)$ with selected mode $m$:

$$N_{ijm} = \left\lceil \frac{Q_{ij}}{K_m} \right\rceil$$

where:
- $N_{ijm}$ = Number of trips required
- $Q_{ij}$ = Quantity to transport
- $K_m$ = Mode capacity
- $\lceil \cdot \rceil$ = Ceiling function (round up)

### Transportation Cost

For each route:

$$TC_{ijm} = N_{ijm} \times c^{mode}_m + d_{ij} \times v^{mode}_m \times Q_{ij}$$

$$= \text{(Fixed Cost)} + \text{(Variable Cost)}$$

Total transportation cost:

$$\text{TotalTransportCost} = \sum_{i \in I} \sum_{j \in J} \sum_{m \in M} TC_{ijm}$$

### Route Consolidation

When multiple destinations can share transportation resources:

#### Consolidation Benefit for Rail

If $|J_{rail}| \geq 2$ (at least 2 destinations using rail):

##### Without Consolidation

$$N_{without} = \sum_{j \in J_{rail}} \left\lceil \frac{Q_{ij}}{K_{rail}} \right\rceil$$

##### With Consolidation

$$Q_{total} = \sum_{j \in J_{rail}} Q_{ij}$$

$$N_{with} = \left\lceil \frac{Q_{total}}{K_{rail}} \right\rceil$$

##### Trips Saved

$$N_{saved} = N_{without} - N_{with}$$

##### Cost Savings

$$\text{FixedSavings} = N_{saved} \times c^{mode}_{rail}$$

$$\text{VariableSavings} = N_{saved} \times 100$$

### Vehicle Utilization

$$\text{Utilization} = \frac{\sum_{ij} Q_{ij}}{\sum_{ij} N_{ij} \times K_m} \times 100\%$$

This measures how efficiently vehicle capacity is used.

---

## Cost Calculations

### Page 7: Plant-Level Costs

For each plant $j$:

#### Production Cost (IUs only)

$$\text{PC}_j = 
\begin{cases}
C_j \times 0.7 \times 45 & \text{if } j \in I \\
0 & \text{if } j \in J \setminus I
\end{cases}$$

Assumes 70% capacity utilization at $45/ton.

#### Incoming Transport Cost

$$\text{TC}^{in}_j = C_j \times 0.5 \times 15$$

Assumes 50% of capacity received at $15/ton transport cost.

#### Outgoing Transport Cost (IUs only)

$$\text{TC}^{out}_j = 
\begin{cases}
C_j \times 0.6 \times 12 & \text{if } j \in I \\
0 & \text{if } j \in J \setminus I
\end{cases}$$

Assumes 60% of capacity shipped at $12/ton transport cost.

#### Inventory Holding Cost

$$\text{IC}_j = C_j \times 0.2 \times 50 \times \frac{0.02}{12}$$

Formula breakdown:
- $C_j \times 0.2$ = Average inventory (20% of capacity)
- $50$ = Value per ton ($)
- $0.02$ = Annual holding cost rate (2%)
- $/12$ = Monthly conversion

#### Total Plant Cost

$$\text{TotalCost}_j = \text{PC}_j + \text{TC}^{in}_j + \text{TC}^{out}_j + \text{IC}_j$$

---

## Inventory Management

### Current Inventory Calculation

$$I_j^{current} = 0.25 \times C_j$$

Current inventory at 25% of plant capacity.

### Safety Stock Policy

$$SS_j = 0.15 \times C_j$$

Safety stock at 15% of plant capacity.

### Compliance Check

$$\text{Compliant} = 
\begin{cases}
\text{True} & \text{if } I_j^{current} \geq SS_j \\
\text{False} & \text{otherwise}
\end{cases}$$

### Risk Indicator

$$\text{Risk} = 
\begin{cases}
\text{"Safe"} & \text{if } I_j^{current} \geq 1.2 \times SS_j \\
\text{"Caution"} & \text{if } SS_j \leq I_j^{current} < 1.2 \times SS_j \\
\text{"At Risk"} & \text{if } I_j^{current} < SS_j
\end{cases}$$

### Inventory Trend Projection

For future period $t$:

$$I_{jt} = \max(SS_j, I_j^{current} - t \times 0.03 \times C_j)$$

Assumes 3% of capacity consumed per period, but never drops below safety stock.

---

## Uncertainty Analysis (Page 8)

### Scenario-Based Analysis

Define scenarios with demand multipliers:

| Scenario | Multiplier ($\alpha$) | Probability ($p$) |
|----------|----------------------|-------------------|
| Low      | 0.8                  | 0.25              |
| Base     | 1.0                  | 0.50              |
| High     | 1.3                  | 0.25              |

### Cost Under Uncertainty

For scenario $s$ with demand multiplier $\alpha_s$:

$$\text{Cost}_s = \text{BaseCost} \times (\alpha_s)^{1.15}$$

The exponent $1.15$ represents **non-linear cost scaling**:
- Higher demand leads to higher per-unit costs due to:
  - Capacity constraints
  - Overtime premiums
  - Expedited shipping

### Expected Cost

$$\text{Expected Cost} = \sum_s p_s \times \text{Cost}_s$$

$$= 0.25 \times \text{Cost}_{low} + 0.50 \times \text{Cost}_{base} + 0.25 \times \text{Cost}_{high}$$

### Risk Metrics

#### Worst Case Cost

$$\text{WorstCase} = \max_s \text{Cost}_s$$

#### Best Case Cost

$$\text{BestCase} = \min_s \text{Cost}_s$$

#### Cost Variance

$$\text{Variance} = \sum_s p_s \times (\text{Cost}_s - \text{Expected Cost})^2$$

### Inventory Buffer Requirement

To handle high-demand scenario:

$$\text{InventoryIncrease} = 0.8 \times (\alpha_{high} - 1.0) \times 100\%$$

$$= 0.8 \times (1.3 - 1.0) \times 100\% = 24\%$$

This suggests increasing inventory by 24% to handle 30% demand increase.

---

## Algorithm Complexity

### Time Complexity Analysis

| Operation | Complexity | Description |
|-----------|-----------|-------------|
| Plant Loading | $O(n)$ | Load $n$ plants from CSV |
| Filtering | $O(n)$ | Filter plants by criteria |
| Allocation | $O(I \times J)$ | Allocate from $I$ IUs to $J$ destinations |
| Mode Selection | $O(R)$ | Select mode for $R$ routes |
| Trip Calculation | $O(R)$ | Calculate trips for $R$ routes |
| Consolidation | $O(R)$ | Analyze $R$ routes for consolidation |
| Inventory Trends | $O(J \times T)$ | Calculate for $J$ plants over $T$ periods |

### Space Complexity

- **Plant Data**: $O(n)$ where $n$ = number of plants (~200)
- **Allocation Matrix**: $O(I \times J \times T)$
- **Route Data**: $O(R)$ where $R$ = number of routes

### Scalability

Current implementation handles:
- ✅ Up to 100 IUs
- ✅ Up to 200 GUs
- ✅ Up to 52 periods (1 year weekly planning)
- ✅ 3 transportation modes
- ✅ Response time: <2 seconds for typical problems

---

## Future Enhancements

### Mixed Integer Linear Programming (MILP)

Future versions will implement full MILP formulation:

#### Decision Variables

- $Q_{ijt}$ = Quantity from IU $i$ to plant $j$ in period $t$ (continuous)
- $N_{ijtm}$ = Number of trips from $i$ to $j$ in period $t$ by mode $m$ (integer)
- $y_{ijtm}$ = Binary variable (1 if mode $m$ used on route $(i,j,t)$)

#### Objective Function

$$\min \sum_{i,j,t} c^{prod} Q_{ijt} + \sum_{i,j,t,m} (c^{mode}_m N_{ijtm} + v^{mode}_m d_{ij} Q_{ijt}) + \sum_{j,t} c^{hold} I_{jt}$$

#### Constraints

1. **Capacity**: $\sum_j Q_{ijt} \leq C_i \quad \forall i,t$
2. **Demand**: $\sum_i Q_{ijt} \geq D_{jt} \quad \forall j,t$
3. **Inventory**: $I_{jt} = I_{j,t-1} + \sum_i Q_{ijt} - D_{jt} \quad \forall j,t$
4. **Safety Stock**: $I_{jt} \geq SS_j \quad \forall j,t$
5. **Mode Capacity**: $Q_{ijt} \leq N_{ijtm} \times K_m \quad \forall i,j,t,m$
6. **Mode Selection**: $\sum_m y_{ijtm} \leq 1 \quad \forall i,j,t$

### Stochastic Programming

For uncertainty, implement two-stage stochastic programming:
- **Stage 1**: Capacity and infrastructure decisions
- **Stage 2**: Operational decisions under each scenario

---

## References

- Operations Research principles
- Supply Chain Optimization theory
- Cement industry best practices
- MILP formulation standards

---

**Version**: 1.0  
**Last Updated**: January 2, 2026  
**Status**: Production Implementation with Future MILP Roadmap
