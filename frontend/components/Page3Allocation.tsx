/**
 * Page 3: Allocation Engine
 * 
 * Features:
 * - Source IU / Destination selection
 * - Run Allocation Optimization button
 * - Allocation matrix display
 * - Inventory trend charts
 * - Production utilization per IU
 * - KPIs: Demand fulfillment, Safety stock compliance, Costs
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AllocationRoute {
  from_plant_id: string;
  to_plant_id: string;
  period: number;
  quantity_tons: number;
  type: string;
}

interface AllocationMatrix {
  source_plant_id: string;
  destination_plant_id: string;
  total_quantity_tons: number;
  periods: { [key: number]: number };
}

interface InventoryTrend {
  plant_id: string;
  period: number;
  inventory_tons: number;
  safety_stock_tons: number;
  max_capacity_tons: number;
  utilization_percent: number;
}

interface AllocationResult {
  allocation_routes: AllocationRoute[];
  allocation_matrices: AllocationMatrix[];
  inventory_trends: InventoryTrend[];
  kpis: {
    demand_fulfillment_percent: number;
    safety_stock_compliance: boolean;
    allocation_cost_dollars: number;
    production_cost_dollars: number;
    inventory_cost_dollars: number;
    total_cost_dollars: number;
  };
  production_utilization: { [key: string]: number };
  solve_time_seconds: number;
}

interface Plant {
  plant_id: string;
  plant_name: string;
  plant_type: 'IU' | 'GU';
}

export default function Page3Allocation() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [sourceIU, setSourceIU] = useState('');
  const [destinations, setDestinations] = useState<Set<string>>(new Set());
  const [showAllAllocations, setShowAllAllocations] = useState(false);
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load plant data from previous page or session
  useEffect(() => {
    const page2Data = sessionStorage.getItem('page2Data');
    if (page2Data) {
      const data = JSON.parse(page2Data);
      const allPlants = [
        ...data.selected_ius.map((id: string) => ({ plant_id: id, plant_name: id, plant_type: 'IU' })),
        ...data.selected_gus.map((id: string) => ({ plant_id: id, plant_name: id, plant_type: 'GU' })),
      ];
      setPlants(allPlants);
      if (data.selected_ius.length > 0) {
        setSourceIU(data.selected_ius[0]);
      }
    } else {
      // Fallback: fetch from API
      fetchPlantData();
    }
  }, []);

  const fetchPlantData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/page1/all-plants`);
      const data = await response.json();
      // Take first 10 plants as sample
      const sample = data.all_plants.slice(0, 10);
      setPlants(sample);
      const firstIU = sample.find((p: Plant) => p.plant_type === 'IU');
      if (firstIU) setSourceIU(firstIU.plant_id);
    } catch (err) {
      setError('Failed to load plants');
    }
  };

  const toggleDestination = (plantId: string) => {
    const newDest = new Set(destinations);
    if (newDest.has(plantId)) {
      newDest.delete(plantId);
    } else {
      newDest.add(plantId);
    }
    setDestinations(newDest);
  };

  const runOptimization = async () => {
    if (!sourceIU) {
      setError('Please select a source IU');
      return;
    }
    if (destinations.size === 0) {
      setError('Please select at least one destination');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/page3/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_iu_id: sourceIU,
          destination_ids: Array.from(destinations),
          show_all_allocations: showAllAllocations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Optimization failed');
      }

      setResult(data);
      // Store for next page
      sessionStorage.setItem('page3Result', JSON.stringify(data));
    } catch (err: any) {
      setError(err.message || 'Failed to run optimization');
    } finally {
      setLoading(false);
    }
  };

  const ius = plants.filter(p => p.plant_type === 'IU');
  const gus = plants.filter(p => p.plant_type === 'GU');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Allocation Engine</h1>
              <p className="text-slate-300 mt-1">Optimize clinker distribution from IUs to GUs</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">Page 3 of 8</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Input Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Source & Destinations</CardTitle>
            <CardDescription>Choose which IU supplies to which destinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source IU */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Source IU</label>
              <select
                value={sourceIU}
                onChange={(e) => setSourceIU(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-white"
              >
                <option value="">Select Source IU</option>
                {ius.map(iu => (
                  <option key={iu.plant_id} value={iu.plant_id}>{iu.plant_name}</option>
                ))}
              </select>
            </div>

            {/* Destinations */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Destinations (IUs or GUs) - Click to select
              </label>
              <div className="flex flex-wrap gap-2">
                {plants
                  .filter(p => p.plant_id !== sourceIU)
                  .map(plant => (
                    <button
                      key={plant.plant_id}
                      onClick={() => toggleDestination(plant.plant_id)}
                      className={`px-3 py-1 rounded border text-sm ${
                        destinations.has(plant.plant_id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-800 border-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {plant.plant_name}
                      <span className={`ml-1 text-xs ${
                        destinations.has(plant.plant_id) ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                        ({plant.plant_type})
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showAll"
                checked={showAllAllocations}
                onChange={(e) => setShowAllAllocations(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showAll" className="text-sm text-slate-200">
                Show all allocations (not just selected pairs)
              </label>
            </div>

            {/* Run Button */}
            <Button
              onClick={runOptimization}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> Running Optimization...
                </span>
              ) : (
                '▶ Run Allocation Optimization'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Results</CardTitle>
                <CardDescription>Solve time: {result.solve_time_seconds.toFixed(2)}s</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-green-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-300">Demand Fulfillment</div>
                    <div className="text-2xl font-bold text-green-600">
                      {result.kpis.demand_fulfillment_percent}%
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${result.kpis.safety_stock_compliance ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}>
                    <div className="text-sm text-slate-300">Safety Stock</div>
                    <div className={`text-2xl font-bold ${result.kpis.safety_stock_compliance ? 'text-green-600' : 'text-yellow-600'}`}>
                      {result.kpis.safety_stock_compliance ? '✓ OK' : '⚠ Risk'}
                    </div>
                  </div>
                  <div className="bg-blue-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-300">Allocation Cost</div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${(result.kpis.allocation_cost_dollars / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div className="bg-purple-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-300">Production Cost</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(result.kpis.production_cost_dollars / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div className="bg-orange-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-300">Inventory Cost</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(result.kpis.inventory_cost_dollars / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg text-center border border-slate-600">
                    <div className="text-sm text-slate-300">Total Cost</div>
                    <div className="text-2xl font-bold text-white">
                      ${(result.kpis.total_cost_dollars / 1000).toFixed(0)}K
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Allocation Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Allocation Matrix</CardTitle>
                <CardDescription>Who supplies whom</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-700">
                        <th className="px-4 py-2 text-left">Source → Destination</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocation_matrices.map((matrix, i) => (
                        <tr key={i} className="border-b hover:bg-slate-700">
                          <td className="px-4 py-2 font-medium">
                            {matrix.source_plant_id} → {matrix.destination_plant_id}
                          </td>
                          <td className="px-4 py-2">
                            <Badge className="bg-blue-100 text-blue-200">Allocation</Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {matrix.total_quantity_tons.toLocaleString()} tons
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Production Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Production Utilization by IU</CardTitle>
                <CardDescription>How much of each IU&apos;s capacity is used</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(result.production_utilization).map(([iuId, utilization]) => (
                    <div key={iuId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{iuId}</span>
                        <span className="text-slate-300">{utilization.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${
                            utilization > 90 ? 'bg-red-900/200' : utilization > 70 ? 'bg-yellow-900/200' : 'bg-green-900/200'
                          }`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Inventory Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Trends</CardTitle>
                <CardDescription>Inventory levels over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Group by plant_id */}
                  {Array.from(new Set(result.inventory_trends.map(t => t.plant_id))).map(plantId => {
                    const trends = result.inventory_trends.filter(t => t.plant_id === plantId);
                    return (
                      <div key={plantId} className="border rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-3">{plantId}</h4>
                        <div className="space-y-2">
                          {trends.map(trend => (
                            <div key={`${trend.plant_id}-${trend.period}`} className="flex justify-between text-sm">
                              <span className="text-slate-300">Period {trend.period}:</span>
                              <span className={`font-medium ${
                                trend.inventory_tons < trend.safety_stock_tons ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {trend.inventory_tons} / {trend.safety_stock_tons} tons
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Page 2
          </Button>
          
          <Button
            onClick={() => window.location.href = '/page4'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!result}
          >
            Proceed to Transportation Setup (Page 4) →
          </Button>
        </div>
      </div>
    </div>
  );
}




