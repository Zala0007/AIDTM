# ClinkerFlow - Clinker Supply Chain Optimization Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Status: Active](https://img.shields.io/badge/status-active-success.svg)]()

Multi-Period MILP Model for Cement Industry (IU–GU Network)

📌 Project Overview

This project is a data-driven supply chain optimization system for clinker allocation and transportation in the cement manufacturing industry.

Clinker is produced at Integrated Units (IUs) and consumed at both Integrated Units (IUs) and Grinding Units (GUs). Managing clinker across a large, distributed network is complex due to:

Multi-period planning

Capacity limits

Inventory safety requirements

Transportation constraints

Integer shipment realities (trucks, trains)

Demand uncertainty

This platform models the entire clinker supply chain as a Mixed-Integer Linear Programming (MILP) problem, solved dynamically using user-uploaded Excel data only.

🚫 No static values
🚫 No hardcoded parameters
✅ Everything is parsed at runtime from uploaded Excel files

🎯 Problem Statement (Industry Context)

In real cement operations:

Production, inventory, and transportation decisions are interdependent

Decisions in one period affect feasibility and cost in future periods

Transportation must respect:

Mode availability (Road / Rail / Sea)

Vehicle capacity

Minimum shipment batch (SBQ)

Integer number of trips

Inventory must always respect minimum safety stock and maximum storage limits

Manual planning or rule-based systems fail to capture these interactions optimally.

This project solves that using Operations Research.

🧠 Solution Approach

We formulate the clinker network as a multi-period MILP with:

Decision Variables

P[i,t] → Production at IU i in period t

X[i,j,m,t] → Quantity shipped from i to j using mode m

T[i,j,m,t] → Integer number of trips

I[i,t] → Inventory at plant i at end of period t

Objective

Minimize total system cost:

Z = Production Cost
  + Transportation Cost
  + Inventory Holding Cost

Subject to

Mass balance constraints

Production capacity limits

Inventory safety stock & max capacity

Transport capacity & integer trips

Strategic constraints from data

Demand fulfillment requirements

📂 Data-Driven Architecture (VERY IMPORTANT)
🔑 Core Principle

The model works ONLY on the data uploaded by the user.

The system does not assume anything about:

Number of plants

Number of periods

Available transport routes

Costs or capacities

Everything is inferred dynamically.

📊 Required Input Files (Excel / CSV)

The user uploads an Excel file containing the following sheets (names are configurable but mapped internally):

Sheet Name	Purpose
IUGUType	IU / GU classification
ClinkerDemand	Demand per plant per period
ClinkerCapacity	Production capacity per IU per period
ProductionCost	Cost of clinker production
LogisticsIUGU	Transport routes, modes, costs, batch sizes
IUGUOpeningStock	Initial inventory
IUGUClosingStock	Min & max inventory constraints
IUGUConstraint	Strategic / policy constraints

📌 If a value is missing → model handles it safely
📌 If a route doesn’t exist → it is not considered

⚙️ How the System Works (Flow)

User uploads Excel

Excel Parser

Reads all sheets dynamically

Converts numeric columns safely

Handles missing or partial data

Route Builder

Constructs feasible IU → GU / IU → IU routes

Applies period-wise logic

MILP Engine

Computes:

Required shipment

Required production

Integer trips

Ending inventories

Evaluates feasibility

Output Engine

Cost breakdown

Inventory trends

Capacity utilization

Constraint satisfaction

KPI metrics

📐 Mathematical Model Summary
Mass Balance
I[i,t] = I[i,t-1] + P[i,t] + Σ inbound - Σ outbound - D[i,t]

Production Capacity
P[i,t] ≤ Capacity[i,t]

Shipment–Trip Link (Integer Reality)
X[i,j,m,t] ≤ T[i,j,m,t] × VehicleCapacity[m]
T ∈ ℤ⁺

Inventory Safety
MinStock[i,t] ≤ I[i,t] ≤ MaxStock[i,t]

🌱 Advanced Features (Bonus / Polishing)
1️⃣ Elastic Safety Stock (ESS)

Demand volatility measured using standard deviation

Lead time derived from transport mode

Safety stock adjusted dynamically

2️⃣ Green Logistics (Carbon Cost)

Emission factor per transport mode

Carbon price applied in objective

Enables trade-off between cost & sustainability

3️⃣ Demand Uncertainty

Scenario-based demand (Low / Base / High)

Expected vs worst-case cost analysis

📊 Outputs & Insights (What Judges See)

When a user selects:

Source plant

Destination plant

Transport mode

Time period

The system generates:

🔹 Decision Variables

Production quantity

Shipment quantity

Number of trips

Ending inventories

🔹 Cost Breakdown

Production cost

Transport cost

Holding cost

Cost per ton delivered

🔹 KPIs

Demand fulfillment %

Capacity utilization %

Inventory turnover

Days of supply

Transport efficiency

🔹 Feasibility Report

Constraint violations (if any)

Safety stock compliance

Capacity slack

🖥️ UI & UX Philosophy

Clean, light, professional colors

Plant-centric selection (Source → Destination)

Step-by-step optimization flow:

Demand & Production

Allocation

Transportation

Cost & Risk Summary

Animated charts & KPI cards

Every number traceable back to Excel

🚀 Why This Project Stands Out

✅ Fully data-driven
✅ Realistic integer logistics
✅ Industry-grade MILP
✅ Explainable decisions
✅ Scalable to national level
✅ Extendable to ESG & carbon planning

This is not a demo — it is a decision-support system.

🛠️ Tech Stack

Python

Pandas / NumPy

PuLP (MILP Solver)

Excel / CSV parsing

Frontend (UI) – modular, dynamic, visualization-heavy

📌 Future Extensions

Cement (not just clinker) optimization

Multi-commodity flows

Carbon cap-and-trade

=== Author ===
Team Tech Alliance
Real-time demand feeds

Stochastic optimization
