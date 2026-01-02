/**
 * Page 5: Transportation Optimization
 * 
 * Features:
 * - Run transportation optimization engine
 * - Route recommendation display
 * - Trip counts per route per mode
 * - SBQ (Standard Batch Quantity) enforcement
 * - Consolidation analysis
 * - Multi-destination benefits visualization
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TransportRoute {
  source_plant_id: string;
  destination_plant_id: string;
  transport_mode: string;
  period: number;
  quantity_tons: number;
  num_trips: number;
  shared_route: boolean;
  transport_cost_dollars: number;
}

interface ConsolidationBenefit {
  route_segment: string;
  destinations_served: number;
  trips_without_consolidation: number;
  trips_with_consolidation: number;
  fixed_cost_saved_dollars: number;
  variable_cost_saved_dollars: number;
}

interface OptimizationResult {
  source_iu: any;
  destinations: any[];
  routes: TransportRoute[];
  consolidation_benefits: ConsolidationBenefit[];
  kpis: {
    total_transport_cost_dollars: number;
    total_destinations_served: number;
    total_trips_required: number;
    trips_saved_from_consolidation: number;
    vehicle_utilization_percent: number;
    consolidation_enabled: boolean;
  };
  solve_time_seconds: number;
}

export default function Page5TransportOptimization() {
  const [page4Data, setPage4Data] = useState<any>(null);
  const [page3Result, setPage3Result] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'routes' | 'consolidation'>('routes');

  useEffect(() => {
    const p4 = sessionStorage.getItem('page4Data');
    const p3 = sessionStorage.getItem('page3Result');
    if (p4) {
      try {
        setPage4Data(JSON.parse(p4));
      } catch (e) {
        console.error('Failed to parse page4Data', e);
      }
    }
    if (p3) {
      try {
        setPage3Result(JSON.parse(p3));
      } catch (e) {
        console.error('Failed to parse page3Result', e);
      }
    }
    
    // Only show error if user tries to proceed without data
    // Don't show error on initial load
  }, []);

  const runOptimization = async () => {
    // Validate we have necessary data
    if (!page4Data) {
      setError('Missing transportation configuration from Page 4. Please go back and configure transport settings.');
      return;
    }

    if (!page4Data.source_iu_id) {
      setError('Missing source IU. Please go back to Page 4 and select a source IU.');
      return;
    }

    if (!page4Data.destination_ids || page4Data.destination_ids.length === 0) {
      setError('Missing destinations. Please go back to Page 4 and select at least one destination.');
      return;
    }

    setIsOptimizing(true);
    setError('');

    try {
      // Extract selected mode IDs from available_modes
      const selectedModes = page4Data.available_modes 
        ? page4Data.available_modes.map((m: any) => m.mode_id)
        : ['truck', 'rail'];

      console.log('Sending to API:', {
        source_iu_id: page4Data.source_iu_id,
        destination_ids: page4Data.destination_ids,
        selected_modes: selectedModes,
        consolidation: page4Data.consolidation_enabled
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/page5/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_iu_id: page4Data.source_iu_id,
          destination_ids: page4Data.destination_ids,
          selected_modes: selectedModes,
          consolidation_enabled: page4Data.consolidation_enabled,
          period: 1,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        const errorMsg = result.detail 
          ? (typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail))
          : 'Optimization failed';
        throw new Error(errorMsg);
      }
      
      setOptimizationResult(result);
      sessionStorage.setItem('page5Result', JSON.stringify(result));
    } catch (err: any) {
      setError(err.message || 'Failed to run optimization');
      console.error('Optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };



  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '$0';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Transportation Optimization</h1>
              <p className="text-slate-300 mt-1">Optimize how clinker moves from source to destinations</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">Page 5 of 8</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 p-4 rounded-lg">
            {error}
          </div>
        )}

        {!page4Data && !page3Result && !error && (
          <div className="bg-amber-900/20 border border-amber-700 text-amber-800 p-4 rounded-lg">
            <strong>Note:</strong> No data from previous pages detected. You can still run the optimization in demo mode, or go back to complete Pages 3 and 4 for accurate results.
          </div>
        )}

        {/* Input Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration from Page 4</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-900/20 p-3 rounded-lg">
                <div className="text-sm text-slate-300">Source</div>
                <div className="font-bold">{page4Data?.source_iu_id || 'Not set'}</div>
              </div>
              <div className="bg-orange-900/20 p-3 rounded-lg">
                <div className="text-sm text-slate-300">Destinations</div>
                <div className="font-bold">{page4Data?.destination_ids?.length || 0}</div>
              </div>
              <div className="bg-green-900/20 p-3 rounded-lg">
                <div className="text-sm text-slate-300">Modes Available</div>
                <div className="font-bold">{page4Data?.available_modes?.length || 0}</div>
              </div>
              <div className="bg-purple-900/20 p-3 rounded-lg">
                <div className="text-sm text-slate-300">Consolidation</div>
                <div className="font-bold">{page4Data?.consolidation_enabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run Optimization */}
        {!optimizationResult && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">🚚</div>
              <h3 className="text-xl font-semibold mb-2">Transportation Optimizer</h3>
              <p className="text-slate-300 mb-6 max-w-lg mx-auto">
                The optimizer will determine the best transport modes, calculate required trips,
                enforce SBQ constraints, and identify consolidation opportunities.
              </p>
              <Button
                onClick={runOptimization}
                disabled={isOptimizing}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
              >
                {isOptimizing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Optimizing Routes...
                  </>
                ) : (
                  '🚀 Run Transportation Optimization'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {optimizationResult && (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="text-sm opacity-80">Total Transport Cost</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(optimizationResult.kpis.total_transport_cost_dollars)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="text-sm opacity-80">Total Trips</div>
                  <div className="text-2xl font-bold">{optimizationResult.kpis.total_trips_required}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-6">
                  <div className="text-sm opacity-80">Routes Planned</div>
                  <div className="text-2xl font-bold">{optimizationResult.routes.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="text-sm opacity-80">Consolidation Savings</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      optimizationResult.consolidation_benefits.reduce(
                        (sum, b) => sum + b.fixed_cost_saved_dollars + b.variable_cost_saved_dollars,
                        0
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                <CardContent className="pt-6">
                  <div className="text-sm opacity-80">Vehicle Utilization</div>
                  <div className="text-2xl font-bold">{optimizationResult.kpis.vehicle_utilization_percent.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setActiveTab('routes')}
                className={`px-4 py-2 -mb-px ${
                  activeTab === 'routes'
                    ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                    : 'text-slate-300 hover:text-blue-600'
                }`}
              >
                Route Details ({optimizationResult.routes.length})
              </button>
              <button
                onClick={() => setActiveTab('consolidation')}
                className={`px-4 py-2 -mb-px ${
                  activeTab === 'consolidation'
                    ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                    : 'text-slate-300 hover:text-blue-600'
                }`}
              >
                Consolidation ({optimizationResult.consolidation_benefits.length})
              </button>
            </div>

            {/* Routes Tab */}
            {activeTab === 'routes' && (
              <Card>
                <CardHeader>
                  <CardTitle>Optimized Routes</CardTitle>
                  <CardDescription>Transportation plan with mode selection and trip counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left">Origin</th>
                          <th className="px-4 py-3 text-left">Destination</th>
                          <th className="px-4 py-3 text-left">Mode</th>
                          <th className="px-4 py-3 text-right">Tons</th>
                          <th className="px-4 py-3 text-right">Trips</th>
                          <th className="px-4 py-3 text-right">Cost</th>
                          <th className="px-4 py-3 text-right">$/Ton</th>
                          <th className="px-4 py-3 text-center">SBQ</th>
                          <th className="px-4 py-3 text-left">Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizationResult.routes.map((route, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-700">
                            <td className="px-4 py-3 font-medium">{route.source_plant_id}</td>
                            <td className="px-4 py-3">{route.destination_plant_id}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{route.transport_mode}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {route.quantity_tons.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{route.num_trips}</td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatCurrency(route.transport_cost_dollars)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              ${(route.transport_cost_dollars / route.quantity_tons).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {route.shared_route ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Progress value={85} className="w-16 h-2" />
                                <span className="text-xs text-slate-400">
                                  85%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Consolidation Tab */}
            {activeTab === 'consolidation' && (
              <Card>
                <CardHeader>
                  <CardTitle>Consolidation Analysis</CardTitle>
                  <CardDescription>Multi-destination shipment opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  {optimizationResult.consolidation_benefits.length > 0 ? (
                    <div className="space-y-4">
                      {optimizationResult.consolidation_benefits.map((benefit, idx) => (
                        <div key={idx} className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="font-semibold text-lg">
                                {benefit.route_segment}
                              </div>
                              <div className="text-sm text-slate-300">
                                Destinations Served: {benefit.destinations_served}
                              </div>
                            </div>
                            <Badge className="bg-green-900/20 text-green-300 border border-green-700">
                              {formatCurrency(benefit.fixed_cost_saved_dollars + benefit.variable_cost_saved_dollars)} Saved
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="bg-slate-700 p-3 rounded">
                              <div className="text-slate-300">With Consolidation</div>
                              <div className="font-bold text-green-600">{benefit.trips_with_consolidation} trips</div>
                            </div>
                            <div className="bg-red-900/20 p-3 rounded">
                              <div className="text-slate-300">Without Consolidation</div>
                              <div className="font-bold text-red-600">{benefit.trips_without_consolidation} trips</div>
                            </div>
                            <div className="bg-green-900/20 p-3 rounded">
                              <div className="text-slate-300">Trips Saved</div>
                              <div className="font-bold text-green-600">{benefit.trips_without_consolidation - benefit.trips_with_consolidation}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <div className="text-4xl mb-4">📦</div>
                      <p>No consolidation opportunities found.</p>
                      <p className="text-sm mt-2">
                        {page4Data?.consolidation_enabled
                          ? 'Shipments are already optimal or below consolidation threshold.'
                          : 'Consolidation is disabled. Enable it on Page 4 to see opportunities.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Page 4
          </Button>
          
          {optimizationResult && (
            <Button
              onClick={() => window.location.href = '/page6'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Proceed to Map Visualization (Page 6) →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}




