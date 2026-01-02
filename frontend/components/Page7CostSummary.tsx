/**
 * Page 7: Cost Summary & KPIs
 * 
 * Features:
 * - Per-plant summary cards
 * - Cost breakdown (production, transport, inventory)
 * - KPI metrics display
 * - Compliance indicators
 * - Export functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PlantSummary {
  plant_id: string;
  plant_name: string;
  plant_type: 'IU' | 'GU';
  production_cost: number;
  transport_cost: number;
  inventory_cost: number;
  total_cost: number;
  capacity_utilization: number;
  demand_fulfillment: number;
  safety_stock_compliance: boolean;
  sbq_compliance: boolean;
}

interface OverallKPIs {
  total_network_cost: number;
  total_production_cost: number;
  total_transport_cost: number;
  total_inventory_cost: number;
  avg_capacity_utilization: number;
  overall_demand_fulfillment: number;
  safety_stock_compliance_rate: number;
  sbq_compliance_rate: number;
}

export default function Page7CostSummary() {
  const [plantSummaries, setPlantSummaries] = useState<PlantSummary[]>([]);
  const [overallKPIs, setOverallKPIs] = useState<OverallKPIs | null>(null);
  const [sortBy, setSortBy] = useState<'total_cost' | 'plant_id' | 'capacity_utilization'>('total_cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'IU' | 'GU'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Generate sample data
    const summaries: PlantSummary[] = [];
    
    // IUs
    for (let i = 1; i <= 5; i++) {
      const prodCost = 50000 + Math.random() * 100000;
      const transCost = 20000 + Math.random() * 50000;
      const invCost = 5000 + Math.random() * 15000;
      summaries.push({
        plant_id: `IU-${String(i).padStart(3, '0')}`,
        plant_name: `Integrated Unit ${i}`,
        plant_type: 'IU',
        production_cost: prodCost,
        transport_cost: transCost,
        inventory_cost: invCost,
        total_cost: prodCost + transCost + invCost,
        capacity_utilization: 70 + Math.random() * 25,
        demand_fulfillment: 95 + Math.random() * 5,
        safety_stock_compliance: Math.random() > 0.2,
        sbq_compliance: Math.random() > 0.1,
      });
    }
    
    // GUs
    for (let i = 1; i <= 8; i++) {
      const transCost = 15000 + Math.random() * 40000;
      const invCost = 3000 + Math.random() * 10000;
      summaries.push({
        plant_id: `GU-${String(i).padStart(3, '0')}`,
        plant_name: `Grinding Unit ${i}`,
        plant_type: 'GU',
        production_cost: 0,
        transport_cost: transCost,
        inventory_cost: invCost,
        total_cost: transCost + invCost,
        capacity_utilization: 60 + Math.random() * 35,
        demand_fulfillment: 90 + Math.random() * 10,
        safety_stock_compliance: Math.random() > 0.15,
        sbq_compliance: Math.random() > 0.1,
      });
    }
    
    setPlantSummaries(summaries);
    
    // Calculate overall KPIs
    const totalProd = summaries.reduce((sum, s) => sum + s.production_cost, 0);
    const totalTrans = summaries.reduce((sum, s) => sum + s.transport_cost, 0);
    const totalInv = summaries.reduce((sum, s) => sum + s.inventory_cost, 0);
    
    setOverallKPIs({
      total_network_cost: totalProd + totalTrans + totalInv,
      total_production_cost: totalProd,
      total_transport_cost: totalTrans,
      total_inventory_cost: totalInv,
      avg_capacity_utilization: summaries.reduce((sum, s) => sum + s.capacity_utilization, 0) / summaries.length,
      overall_demand_fulfillment: summaries.reduce((sum, s) => sum + s.demand_fulfillment, 0) / summaries.length,
      safety_stock_compliance_rate: (summaries.filter(s => s.safety_stock_compliance).length / summaries.length) * 100,
      sbq_compliance_rate: (summaries.filter(s => s.sbq_compliance).length / summaries.length) * 100,
    });
  };

  const formatCurrency = (value: number) => 
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const filteredSummaries = plantSummaries
    .filter(s => filterType === 'all' || s.plant_type === filterType)
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const handleExport = () => {
    const data = {
      generated_at: new Date().toISOString(),
      overall_kpis: overallKPIs,
      plant_summaries: plantSummaries,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cost_summary_export.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Cost Summary & KPIs</h1>
              <p className="text-slate-300 mt-1">Comprehensive cost breakdown and performance metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleExport}>
                📥 Export Report
              </Button>
              <Badge variant="outline" className="text-lg px-3 py-1">Page 7 of 8</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Overall KPIs */}
        {overallKPIs && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="text-sm opacity-80">Total Network Cost</div>
                <div className="text-2xl font-bold">{formatCurrency(overallKPIs.total_network_cost)}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="text-sm opacity-80">Avg Capacity Utilization</div>
                <div className="text-2xl font-bold">{overallKPIs.avg_capacity_utilization.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="pt-6">
                <div className="text-sm opacity-80">Demand Fulfillment</div>
                <div className="text-2xl font-bold">{overallKPIs.overall_demand_fulfillment.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="pt-6">
                <div className="text-sm opacity-80">Safety Stock Compliance</div>
                <div className="text-2xl font-bold">{overallKPIs.safety_stock_compliance_rate.toFixed(0)}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cost Breakdown Chart */}
        {overallKPIs && (
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Distribution of costs across categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Production Cost</span>
                        <span className="text-sm text-slate-300">
                          {formatCurrency(overallKPIs.total_production_cost)} 
                          ({((overallKPIs.total_production_cost / overallKPIs.total_network_cost) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-4">
                        <div 
                          className="bg-blue-600 h-4 rounded-full"
                          style={{ width: `${(overallKPIs.total_production_cost / overallKPIs.total_network_cost) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Transport Cost</span>
                        <span className="text-sm text-slate-300">
                          {formatCurrency(overallKPIs.total_transport_cost)}
                          ({((overallKPIs.total_transport_cost / overallKPIs.total_network_cost) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-4">
                        <div 
                          className="bg-green-600 h-4 rounded-full"
                          style={{ width: `${(overallKPIs.total_transport_cost / overallKPIs.total_network_cost) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Inventory Cost</span>
                        <span className="text-sm text-slate-300">
                          {formatCurrency(overallKPIs.total_inventory_cost)}
                          ({((overallKPIs.total_inventory_cost / overallKPIs.total_network_cost) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-4">
                        <div 
                          className="bg-orange-600 h-4 rounded-full"
                          style={{ width: `${(overallKPIs.total_inventory_cost / overallKPIs.total_network_cost) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters & Sort */}
        <div className="flex gap-4 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Plants</option>
            <option value="IU">IUs Only</option>
            <option value="GU">GUs Only</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="total_cost">Sort by Total Cost</option>
            <option value="plant_id">Sort by Plant ID</option>
            <option value="capacity_utilization">Sort by Utilization</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-white hover:bg-slate-600"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>

        {/* Plant Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map(plant => (
            <Card key={plant.plant_id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{plant.plant_id}</CardTitle>
                    <CardDescription>{plant.plant_name}</CardDescription>
                  </div>
                  <Badge className={plant.plant_type === 'IU' ? 'bg-blue-900/20 text-blue-300 border border-blue-700' : 'bg-orange-900/20 text-orange-300 border border-orange-700'}>
                    {plant.plant_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Costs */}
                <div className="space-y-2 text-sm">
                  {plant.production_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">Production</span>
                      <span className="font-medium">{formatCurrency(plant.production_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-300">Transport</span>
                    <span className="font-medium">{formatCurrency(plant.transport_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Inventory</span>
                    <span className="font-medium">{formatCurrency(plant.inventory_cost)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Cost</span>
                    <span className="font-bold text-blue-600">{formatCurrency(plant.total_cost)}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Capacity Utilization</span>
                      <span>{plant.capacity_utilization.toFixed(0)}%</span>
                    </div>
                    <Progress value={plant.capacity_utilization} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Demand Fulfillment</span>
                      <span>{plant.demand_fulfillment.toFixed(0)}%</span>
                    </div>
                    <Progress value={plant.demand_fulfillment} className="h-2" />
                  </div>
                </div>

                {/* Compliance */}
                <div className="flex gap-2">
                  <Badge className={plant.safety_stock_compliance ? 'bg-green-900/20 text-green-300 border border-green-700' : 'bg-red-900/20 text-red-300 border border-red-700'}>
                    {plant.safety_stock_compliance ? '✓ Safety Stock' : '✗ Safety Stock'}
                  </Badge>
                  <Badge className={plant.sbq_compliance ? 'bg-green-900/20 text-green-300 border border-green-700' : 'bg-red-900/20 text-red-300 border border-red-700'}>
                    {plant.sbq_compliance ? '✓ SBQ' : '✗ SBQ'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Page 6
          </Button>
          
          <Button
            onClick={() => window.location.href = '/page8'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Proceed to Uncertainty Analysis (Page 8) →
          </Button>
        </div>
      </div>
    </div>
  );
}




