# Clinker Supply Chain Optimization - Decision Support System

> A comprehensive Decision Support System for optimizing clinker production, allocation, and transportation in cement manufacturing supply chains

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## 🎯 Overview

This system optimizes the multi-period, multi-plant production and distribution of **clinker** (intermediate cement product) across a network of:

- **Integrated Units (IUs)**: Plants that produce clinker
- **Grinding Units (GUs)**: Plants that consume clinker to produce final cement products

### Key Business Problem

Cement manufacturers face complex decisions:
- **Where** to produce clinker (which IUs)
- **How much** to produce in each period
- **Where to send** clinker (allocation to IUs and GUs)
- **How to transport** (mode selection: truck/rail/ship)
- **When to move** clinker (timing across periods)
- **How to consolidate** routes for cost savings

All while maintaining:
- ✅ Demand fulfillment
- ✅ Safety stock compliance
- ✅ Transportation constraints (capacity, minimum batch quantities)
- ✅ Inventory balance
- ✅ Cost minimization

## ✨ Features

### 8-Page Workflow

1. **Plant Selection** - Interactive map-based selection of IUs and GUs
2. **Demand & Production** - Configure demand, production capacity, and inventory policies
3. **Allocation Optimization** - Run optimization to determine production and allocation plans
4. **Transportation Setup** - Configure transport modes and parameters
5. **Transportation Optimization** - Optimize mode selection, trips, and route consolidation
6. **Map Visualization** - Geographic visualization of optimized routes
7. **Cost Summary** - Detailed cost breakdown per plant
8. **Uncertainty Analysis** - Scenario analysis for demand uncertainty

### Core Capabilities

- ✅ **Dynamic Calculations**: All values computed from actual plant capacities and distances
- ✅ **Multi-Period Planning**: Optimize across multiple weeks/months
- ✅ **Route Consolidation**: Identify multi-destination shipment opportunities
- ✅ **Mode Selection**: Automatic selection based on distance and quantity
- ✅ **Real Plant Data**: Uses actual Indian cement plant locations and capacities
- ✅ **Responsive UI**: Beautiful, animated dashboard with Tailwind CSS
- ✅ **RESTful API**: Clean separation between frontend and backend

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                        │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Page 1-8   │  │  Components  │  │  UI Library      │     │
│  │  Workflow   │  │  (React)     │  │  (shadcn/ui)     │     │
│  └─────────────┘  └──────────────┘  └──────────────────┘     │
│                                                                 │
│  Tailwind CSS • TypeScript • Framer Motion                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/REST API
                          │ (JSON)
┌─────────────────────────▼───────────────────────────────────────┐
│                   BACKEND (FastAPI)                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  API Routes  │  │  Services    │  │  Optimization    │    │
│  │  (8 Pages)   │  │  (Business)  │  │  Engine          │    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
│                                                                 │
│  Pydantic Models • Plant Data Service • Dynamic Calculations   │
└─────────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- **Git**

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd clinker-dss
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn app.main:app --reload
```

Backend will run on: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:3000`

### Quick Start Guide

1. Open `http://localhost:3000` in your browser
2. **Page 1**: Select plants from the map (minimum 1 IU and 1 GU)
3. **Page 2**: Configure demand and production parameters
4. **Page 3**: Click "Run Allocation Optimization" to see optimal production plan
5. **Page 4**: Configure transportation modes
6. **Page 5**: Click "Run Transportation Optimization" to see route recommendations
7. **Page 6**: View routes on an interactive map
8. **Page 7**: Analyze cost breakdown
9. **Page 8**: Run uncertainty analysis

## 📁 Project Structure

```
clinker-dss/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application & API routes
│   │   ├── config.py                  # Configuration settings
│   │   ├── models/
│   │   │   └── page_schemas.py        # Pydantic models for all 8 pages
│   │   ├── services/
│   │   │   ├── plant_data_service.py  # Plant data management
│   │   │   ├── allocation_optimizer.py        # Allocation optimization
│   │   │   └── transportation_optimizer.py    # Transportation optimization
│   │   └── utils/
│   ├── data/
│   │   └── plants.csv                 # Plant master data
│   ├── requirements.txt               # Python dependencies
│   └── start_server.ps1              # Quick start script
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Home page
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global styles
│   │   └── page1-8/                  # Page routes
│   │       └── page.tsx
│   ├── components/
│   │   ├── Page1Overview.tsx         # Plant selection
│   │   ├── Page2DemandProduction.tsx # Demand & production inputs
│   │   ├── Page3Allocation.tsx       # Allocation optimization
│   │   ├── Page4TransportInputs.tsx  # Transport configuration
│   │   ├── Page5TransportOptimization.tsx  # Transport optimization
│   │   ├── Page6MapVisualization.tsx # Map view
│   │   ├── Page7CostSummary.tsx      # Cost analysis
│   │   ├── Page8UncertaintyAnalysis.tsx    # Scenario analysis
│   │   └── ui/                       # Reusable UI components
│   ├── package.json                  # Node dependencies
│   └── next.config.ts                # Next.js configuration
│
├── data/
│   └── plants.csv                    # Shared plant data
│
├── README.md                         # This file
├── ARCHITECTURE.md                   # Detailed architecture documentation
└── MATHEMATICAL_MODEL.md             # Optimization model documentation
```

## 🛠️ Technology Stack

### Frontend

- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **HTTP Client**: Fetch API

### Backend

- **Framework**: FastAPI
- **Language**: Python 3.10+
- **Validation**: Pydantic
- **Data Processing**: Pandas
- **HTTP Server**: Uvicorn
- **Optimization**: Dynamic calculation engine
- **Future**: Pyomo/PuLP integration for advanced optimization

### Data

- **Format**: CSV
- **Storage**: File-based (plants.csv)
- **Future**: PostgreSQL/MongoDB integration ready

## 📚 API Documentation

### Base URL

```
http://localhost:8000
```

### Endpoints

#### Page 1: Plant Selection
- `GET /api/page1/all-plants` - Get all plants with optional filters
- `GET /api/page1/filters` - Get available filter options

#### Page 2: Demand & Production
- `POST /api/page2/submit` - Submit demand and production configuration

#### Page 3: Allocation Optimization
- `POST /api/page3/optimize` - Run allocation optimization

#### Page 4: Transportation Setup
- `POST /api/page4/setup` - Setup transportation parameters

#### Page 5: Transportation Optimization
- `POST /api/page5/optimize` - Run transportation optimization

#### Page 6: Map Visualization
- `GET /api/page6/map-data` - Get map visualization data

#### Page 7: Cost Summary
- `GET /api/page7/plant-summary` - Get plant cost summary

#### Page 8: Uncertainty Analysis
- `POST /api/page8/uncertainty-analysis` - Run scenario analysis

For detailed API documentation with request/response schemas, visit:
`http://localhost:8000/docs` (Swagger UI)

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Not required - using defaults
LOG_LEVEL=INFO
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 Mathematical Model

The system uses dynamic calculations based on actual plant capacities, distances, and operational parameters. Key features:

- **Allocation**: Proportional distribution based on destination capacities
- **Transportation**: Mode selection based on distance and quantity
- **Costs**: Calculated from capacity, distance, and operational factors
- **Inventory**: Dynamic safety stock and holding costs

For detailed mathematical formulations, see [MATHEMATICAL_MODEL.md](./MATHEMATICAL_MODEL.md)

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests (if available)
5. Commit: `git commit -am 'Add new feature'`
6. Push: `git push origin feature/your-feature`
7. Create a Pull Request

### Code Standards

- **Python**: Follow PEP 8
- **TypeScript**: Use ESLint configuration
- **Commits**: Use conventional commit messages

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Authors

- Development Team - Initial work

## 🙏 Acknowledgments

- Indian cement industry for plant data
- Open-source community for tools and libraries
- FastAPI and Next.js teams for excellent frameworks

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact the development team

---

**Built with ❤️ for optimizing cement supply chains**
