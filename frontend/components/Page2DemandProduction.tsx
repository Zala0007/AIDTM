/**
 * Page 2: Demand & Production Inputs
 * 
 * Features:
 * - Editable demand tables for each period
 * - Global demand multiplier (0.8x to 1.3x)
 * - Production capacity display per IU
 * - Initial inventory and safety stock settings
 * - Period selector (Week/Month)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Plant {
  plant_id: string;
  plant_name: string;
  plant_type: 'IU' | 'GU';
  state: string;
  region: string;
  location_lat: number;
  location_lon: number;
  company: string;
  capacity_tons: number;
}

interface DemandInput {
  plant_id: string;
  period: number;
  demand_tons: number;
}

interface ProductionCapacity {
  iu_id: string;
  period: number;
  max_production_tons: number;
  variable_cost_per_ton: number;
}

interface InventorySetup {
  plant_id: string;
  initial_inventory_tons: number;
  safety_stock_policy: 'conservative' | 'balanced' | 'aggressive';
}

export default function Page2DemandProduction() {
  const [selectedPlants, setSelectedPlants] = useState<Plant[]>([]);
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
  const [numPeriods, setNumPeriods] = useState(4);
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [demands, setDemands] = useState<{ [key: string]: { [period: number]: number } }>({});
  const [inventorySetups, setInventorySetups] = useState<{ [key: string]: InventorySetup }>({});
  const [productionCapacities, setProductionCapacities] = useState<{ [key: string]: ProductionCapacity[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Parse selected plants from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plantIds = params.get('plants')?.split(',') || [];
    
    if (plantIds.length === 0) {
      setError('No plants selected. Please go back to Page 1.');
      setLoading(false);
      return;
    }

    // Fetch plant details
    const fetchPlants = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/page1/all-plants?${plantIds.map(id => `selected_plant_ids=${id}`).join('&')}`
        );
        const data = await response.json();
        setSelectedPlants(data.selected_plants);
        
        // Initialize demands with default values
        const initialDemands: { [key: string]: { [period: number]: number } } = {};
        const initialInventory: { [key: string]: InventorySetup } = {};
        const initialProduction: { [key: string]: ProductionCapacity[] } = {};
        
        data.selected_plants.forEach((plant: Plant) => {
          initialDemands[plant.plant_id] = {};
          // Calculate demand based on plant capacity and type
          const demandPerPeriod = plant.plant_type === 'GU' 
            ? Math.round(plant.capacity_tons * 0.3)  // GUs: 30% of capacity per period
            : Math.round(plant.capacity_tons * 0.15); // IUs: 15% of capacity per period
          
          for (let p = 1; p <= numPeriods; p++) {
            initialDemands[plant.plant_id][p] = demandPerPeriod;
          }
          
          // Initial inventory: 20% of capacity
          initialInventory[plant.plant_id] = {
            plant_id: plant.plant_id,
            initial_inventory_tons: Math.round(plant.capacity_tons * 0.2),
            safety_stock_policy: 'balanced',
          };
          
          if (plant.plant_type === 'IU') {
            initialProduction[plant.plant_id] = [];
            // Variable cost scales with capacity (economies of scale)
            const variableCost = Math.round(40 + (10000 / plant.capacity_tons));
            
            for (let p = 1; p <= numPeriods; p++) {
              initialProduction[plant.plant_id].push({
                iu_id: plant.plant_id,
                period: p,
                max_production_tons: Math.round(plant.capacity_tons * 0.9), // 90% utilization max
                variable_cost_per_ton: variableCost,
              });
            }
          }
        });
        
        setDemands(initialDemands);
        setInventorySetups(initialInventory);
        setProductionCapacities(initialProduction);
        setLoading(false);
      } catch (err) {
        setError('Failed to load plant data');
        setLoading(false);
      }
    };

    fetchPlants();
  }, [numPeriods]);

  const updateDemand = (plantId: string, period: number, value: number) => {
    setDemands(prev => ({
      ...prev,
      [plantId]: {
        ...prev[plantId],
        [period]: value,
      }
    }));
  };

  const updateInventory = (plantId: string, field: keyof InventorySetup, value: any) => {
    setInventorySetups(prev => ({
      ...prev,
      [plantId]: {
        ...prev[plantId],
        [field]: value,
      }
    }));
  };

  const handleProceed = async () => {
    // Prepare request
    const ius = selectedPlants.filter(p => p.plant_type === 'IU').map(p => p.plant_id);
    const gus = selectedPlants.filter(p => p.plant_type === 'GU').map(p => p.plant_id);
    
    // Validation
    if (ius.length === 0) {
      setError('Please select at least one Integrated Unit (IU) from Page 1');
      return;
    }
    
    if (gus.length === 0) {
      setError('Please select at least one Grinding Unit (GU) from Page 1');
      return;
    }
    
    const demandList: DemandInput[] = [];
    Object.entries(demands).forEach(([plantId, periods]) => {
      Object.entries(periods).forEach(([period, demandTons]) => {
        if (demandTons > 0) {
          demandList.push({
            plant_id: plantId,
            period: parseInt(period),
            demand_tons: demandTons,
          });
        }
      });
    });
    
    if (demandList.length === 0) {
      setError('Please enter demand values for at least one plant and period');
      return;
    }
    
    const productionList: ProductionCapacity[] = [];
    Object.values(productionCapacities).forEach(caps => {
      caps.forEach(cap => {
        if (cap.max_production_tons > 0) {
          productionList.push(cap);
        }
      });
    });
    
    if (productionList.length === 0) {
      setError('Please enter production capacity values for at least one IU and period');
      return;
    }
    
    const inventoryList = Object.values(inventorySetups);
    if (inventoryList.length === 0) {
      setError('Please configure inventory settings for at least one GU');
      return;
    }
    
    const request = {
      selected_ius: ius,
      selected_gus: gus,
      demand_table: {
        period_type: periodType,
        demands: demandList,
        demand_multiplier: demandMultiplier,
      },
      production_capacities: productionList,
      inventory_setups: inventoryList,
    };
    
    console.log('Submitting Page 2 data:', {
      ius_count: ius.length,
      gus_count: gus.length,
      demands_count: demandList.length,
      production_count: productionList.length,
      inventory_count: inventoryList.length
    });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/page2/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = typeof data.detail === 'string' 
          ? data.detail 
          : Array.isArray(data.detail)
            ? data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
            : 'Validation failed';
        setError(errorMsg);
        console.error('API Error:', data);
        return;
      }
      
      // Store data and proceed
      sessionStorage.setItem('page2Data', JSON.stringify(request));
      window.location.href = '/page3';
    } catch (err: any) {
      setError(err.message || 'Failed to submit data');
      console.error('Submit error:', err);
    }
  };

  // Calculate totals
  const totalDemand = Object.values(demands).reduce((acc, periods) => {
    return acc + Object.values(periods).reduce((sum, d) => sum + d, 0);
  }, 0) * demandMultiplier;

  const totalProduction = Object.values(productionCapacities).reduce((acc, caps) => {
    return acc + caps.reduce((sum, c) => sum + c.max_production_tons, 0);
  }, 0);

  const ius = selectedPlants.filter(p => p.plant_type === 'IU');
  const gus = selectedPlants.filter(p => p.plant_type === 'GU');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Demand & Production</h1>
              <p className="text-slate-300 mt-1">Set demand requirements and production parameters</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">Page 2 of 8</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Global Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Planning Settings</CardTitle>
            <CardDescription>Configure global parameters for demand planning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Period Type</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPeriodType('week')}
                    className={`px-4 py-2 rounded border ${periodType === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setPeriodType('month')}
                    className={`px-4 py-2 rounded border ${periodType === 'month' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Number of Periods</label>
                <select
                  value={numPeriods}
                  onChange={(e) => setNumPeriods(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-white"
                >
                  {[4, 8, 12, 13, 26, 52].map(n => (
                    <option key={n} value={n}>{n} {periodType === 'week' ? 'weeks' : 'months'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Demand Multiplier: {demandMultiplier.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={demandMultiplier}
                  onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0.8x</span>
                  <span>1.0x</span>
                  <span>1.3x</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-slate-300">Total Demand (adjusted)</div>
                  <div className="text-2xl font-bold text-blue-600">{totalDemand.toLocaleString()} tons</div>
                </div>
                <div>
                  <div className="text-sm text-slate-300">Total Production Capacity</div>
                  <div className="text-2xl font-bold text-green-600">{totalProduction.toLocaleString()} tons</div>
                </div>
                <div>
                  <div className="text-sm text-slate-300">Status</div>
                  <div className={`text-2xl font-bold ${totalProduction >= totalDemand ? 'text-green-600' : 'text-red-600'}`}>
                    {totalProduction >= totalDemand ? '✓ Feasible' : '⚠ Insufficient'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demand Tables by Plant */}
        <Card>
          <CardHeader>
            <CardTitle>Demand by Plant</CardTitle>
            <CardDescription>Enter demand for each plant (both IUs and GUs can receive clinker)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-200">Plant</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-200">Type</th>
                    {Array.from({ length: numPeriods }, (_, i) => (
                      <th key={i} className="px-4 py-2 text-center text-sm font-medium text-slate-200">
                        P{i + 1}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-center text-sm font-medium text-slate-200">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlants.map(plant => (
                    <tr key={plant.plant_id} className="border-b hover:bg-slate-700">
                      <td className="px-4 py-2 text-sm font-medium">{plant.plant_name}</td>
                      <td className="px-4 py-2">
                        <Badge className={plant.plant_type === 'IU' ? 'bg-blue-900/20 text-blue-300' : 'bg-orange-900/20 text-orange-300'}>
                          {plant.plant_type}
                        </Badge>
                      </td>
                      {Array.from({ length: numPeriods }, (_, i) => (
                        <td key={i} className="px-2 py-2">
                          <input
                            type="number"
                            value={demands[plant.plant_id]?.[i + 1] || 0}
                            onChange={(e) => updateDemand(plant.plant_id, i + 1, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-slate-600 rounded bg-slate-700 text-white text-center text-sm"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center font-semibold">
                        {Object.values(demands[plant.plant_id] || {}).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Inventory & Safety Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Setup</CardTitle>
            <CardDescription>Configure initial inventory and safety stock policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedPlants.map(plant => (
                <div key={plant.plant_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-sm">{plant.plant_name}</span>
                    <Badge className={plant.plant_type === 'IU' ? 'bg-blue-100 text-blue-200' : 'bg-orange-100 text-orange-200'}>
                      {plant.plant_type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-300">Initial Inventory (tons)</label>
                      <input
                        type="number"
                        value={inventorySetups[plant.plant_id]?.initial_inventory_tons || 0}
                        onChange={(e) => updateInventory(plant.plant_id, 'initial_inventory_tons', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-600 rounded text-sm bg-slate-700 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-300">Safety Stock Policy</label>
                      <div className="flex gap-2 mt-1">
                        {(['conservative', 'balanced', 'aggressive'] as const).map(policy => (
                          <button
                            key={policy}
                            onClick={() => updateInventory(plant.plant_id, 'safety_stock_policy', policy)}
                            className={`text-xs px-2 py-1 rounded border capitalize ${
                              inventorySetups[plant.plant_id]?.safety_stock_policy === policy
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-800 border-slate-600 text-slate-300'
                            }`}
                          >
                            {policy}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Production Capacity (Read-only for IUs) */}
        <Card>
          <CardHeader>
            <CardTitle>Production Capacity (IUs Only)</CardTitle>
            <CardDescription>Maximum production capacity per period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-200">IU Plant</th>
                    {Array.from({ length: numPeriods }, (_, i) => (
                      <th key={i} className="px-4 py-2 text-center text-sm font-medium text-slate-200">
                        P{i + 1} Capacity
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ius.map(plant => (
                    <tr key={plant.plant_id} className="border-b">
                      <td className="px-4 py-2">
                        <div className="font-medium text-sm">{plant.plant_name}</div>
                        <div className="text-xs text-slate-400">{plant.plant_id}</div>
                      </td>
                      {Array.from({ length: numPeriods }, (_, i) => (
                        <td key={i} className="px-4 py-2 text-center text-sm text-slate-200">
                          {plant.capacity_tons.toLocaleString()} tons
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            ← Back to Page 1
          </Button>
          
          <Button
            onClick={handleProceed}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Proceed to Allocation Engine (Page 3) →
          </Button>
        </div>
      </div>
    </div>
  );
}




