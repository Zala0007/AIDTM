/**
 * Page 8: Uncertainty & Scenario Analysis
 * 
 * Features:
 * - Multi-scenario comparison
 * - Demand uncertainty simulation
 * - Cost sensitivity analysis
 * - Robustness metrics
 * - What-if scenarios
 * - Final decision support
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Scenario {
  id: string;
  name: string;
  description: string;
  demand_multiplier: number;
  cost_index: number;
  total_cost: number;
  feasibility: 'feasible' | 'infeasible' | 'marginal';
  demand_fulfillment: number;
  capacity_utilization: number;
}

interface SensitivityPoint {
  parameter_value: number;
  total_cost: number;
  feasibility: boolean;
}

interface RobustnessMetric {
  metric_name: string;
  base_value: number;
  worst_case: number;
  best_case: number;
  variance: number;
}

export default function Page8UncertaintyAnalysis() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [sensitivityData, setSensitivityData] = useState<SensitivityPoint[]>([]);
  const [robustnessMetrics, setRobustnessMetrics] = useState<RobustnessMetric[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  useEffect(() => {
    initializeScenarios();
    // Automatically run analysis on page load
    setTimeout(() => {
      runAnalysis();
    }, 100);
  }, []);

  const initializeScenarios = () => {
    const predefinedScenarios: Scenario[] = [
      {
        id: 'base',
        name: 'Base Case',
        description: 'Current demand and cost assumptions',
        demand_multiplier: 1.0,
        cost_index: 1.0,
        total_cost: 850000,
        feasibility: 'feasible',
        demand_fulfillment: 98.5,
        capacity_utilization: 82.3,
      },
      {
        id: 'high_demand',
        name: 'High Demand (+20%)',
        description: 'Peak season or market growth scenario',
        demand_multiplier: 1.2,
        cost_index: 1.0,
        total_cost: 1020000,
        feasibility: 'feasible',
        demand_fulfillment: 95.2,
        capacity_utilization: 94.8,
      },
      {
        id: 'low_demand',
        name: 'Low Demand (-15%)',
        description: 'Economic slowdown scenario',
        demand_multiplier: 0.85,
        cost_index: 1.0,
        total_cost: 710000,
        feasibility: 'feasible',
        demand_fulfillment: 100,
        capacity_utilization: 68.5,
      },
      {
        id: 'high_fuel',
        name: 'High Fuel Costs (+30%)',
        description: 'Fuel price spike scenario',
        demand_multiplier: 1.0,
        cost_index: 1.3,
        total_cost: 980000,
        feasibility: 'feasible',
        demand_fulfillment: 98.5,
        capacity_utilization: 82.3,
      },
      {
        id: 'stress_test',
        name: 'Stress Test',
        description: 'High demand + high fuel costs',
        demand_multiplier: 1.25,
        cost_index: 1.35,
        total_cost: 1250000,
        feasibility: 'marginal',
        demand_fulfillment: 89.8,
        capacity_utilization: 98.2,
      },
      {
        id: 'optimistic',
        name: 'Optimistic',
        description: 'Low fuel costs + moderate demand',
        demand_multiplier: 1.05,
        cost_index: 0.85,
        total_cost: 720000,
        feasibility: 'feasible',
        demand_fulfillment: 99.1,
        capacity_utilization: 85.6,
      },
    ];
    
    setScenarios(predefinedScenarios);
    setSelectedScenarios(new Set(['base', 'high_demand', 'low_demand']));
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate sensitivity data
    const sensitivity: SensitivityPoint[] = [];
    for (let mult = 0.7; mult <= 1.4; mult += 0.05) {
      const baseCost = 850000;
      const cost = baseCost * (0.5 + 0.5 * mult) + (mult > 1.2 ? 50000 : 0);
      sensitivity.push({
        parameter_value: mult,
        total_cost: cost,
        feasibility: mult <= 1.25,
      });
    }
    setSensitivityData(sensitivity);
    
    // Generate robustness metrics
    const robustness: RobustnessMetric[] = [
      {
        metric_name: 'Total Network Cost',
        base_value: 850000,
        worst_case: 1250000,
        best_case: 710000,
        variance: 0.24,
      },
      {
        metric_name: 'Demand Fulfillment Rate',
        base_value: 98.5,
        worst_case: 89.8,
        best_case: 100,
        variance: 0.04,
      },
      {
        metric_name: 'Capacity Utilization',
        base_value: 82.3,
        worst_case: 98.2,
        best_case: 68.5,
        variance: 0.12,
      },
      {
        metric_name: 'Transport Cost Share',
        base_value: 35.2,
        worst_case: 42.5,
        best_case: 28.6,
        variance: 0.16,
      },
    ];
    setRobustnessMetrics(robustness);
    
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const toggleScenario = (id: string) => {
    const newSelected = new Set(selectedScenarios);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedScenarios(newSelected);
  };

  const formatCurrency = (value: number) => 
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getFeasibilityColor = (f: string) => {
    if (f === 'feasible') return 'bg-green-900/20 text-green-300 border border-green-700';
    if (f === 'marginal') return 'bg-yellow-900/20 text-yellow-300 border border-yellow-700';
    return 'bg-red-900/20 text-red-300 border border-red-700';
  };

  const handleExportFinalReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      scenarios: scenarios.filter(s => selectedScenarios.has(s.id)),
      sensitivity_data: sensitivityData,
      robustness_metrics: robustnessMetrics,
      recommendation: 'Based on the analysis, the current allocation and transportation plan is robust under normal operating conditions. Consider maintaining buffer capacity for high-demand scenarios.',
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinker_dss_final_report.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Uncertainty & Scenario Analysis</h1>
              <p className="text-slate-300 mt-1">Evaluate robustness under demand uncertainty</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1 bg-green-900/20 text-green-300 border-green-300">
              Page 8 of 8 ✓
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Scenario Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Scenarios to Compare</CardTitle>
            <CardDescription>Choose multiple scenarios for comparative analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map(scenario => (
                <div
                  key={scenario.id}
                  onClick={() => toggleScenario(scenario.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedScenarios.has(scenario.id)
                      ? 'border-blue-500 bg-blue-900/20 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold">{scenario.name}</div>
                    <Badge className={getFeasibilityColor(scenario.feasibility)}>
                      {scenario.feasibility}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{scenario.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Demand:</span>{' '}
                      <span className="font-medium">{(scenario.demand_multiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Cost Index:</span>{' '}
                      <span className="font-medium">{(scenario.cost_index * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Cost:</span>{' '}
                      <span className="font-medium">{formatCurrency(scenario.total_cost)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Fulfillment:</span>{' '}
                      <span className="font-medium">{scenario.demand_fulfillment}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <Button
                onClick={runAnalysis}
                disabled={isAnalyzing || selectedScenarios.size < 2}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8"
              >
                {isAnalyzing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Running Analysis...
                  </>
                ) : (
                  `🔍 Run Comparative Analysis (${selectedScenarios.size} scenarios)`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisComplete && (
          <>
            {/* Scenario Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Scenario Comparison</CardTitle>
                <CardDescription>Side-by-side comparison of selected scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Scenario</th>
                        <th className="px-4 py-3 text-right">Demand</th>
                        <th className="px-4 py-3 text-right">Cost Index</th>
                        <th className="px-4 py-3 text-right">Total Cost</th>
                        <th className="px-4 py-3 text-right">Fulfillment</th>
                        <th className="px-4 py-3 text-right">Utilization</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios
                        .filter(s => selectedScenarios.has(s.id))
                        .map((scenario, idx) => (
                          <tr key={scenario.id} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700'}>
                            <td className="px-4 py-3 font-medium">{scenario.name}</td>
                            <td className="px-4 py-3 text-right">{(scenario.demand_multiplier * 100).toFixed(0)}%</td>
                            <td className="px-4 py-3 text-right">{(scenario.cost_index * 100).toFixed(0)}%</td>
                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(scenario.total_cost)}</td>
                            <td className="px-4 py-3 text-right">{scenario.demand_fulfillment}%</td>
                            <td className="px-4 py-3 text-right">{scenario.capacity_utilization}%</td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={getFeasibilityColor(scenario.feasibility)}>
                                {scenario.feasibility}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Sensitivity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Demand Sensitivity Analysis</CardTitle>
                <CardDescription>How total cost changes with demand variation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1">
                  {sensitivityData.map((point, idx) => {
                    const maxCost = Math.max(...sensitivityData.map(p => p.total_cost));
                    const height = (point.total_cost / maxCost) * 100;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className={`w-full rounded-t transition-all ${
                            point.feasibility ? 'bg-blue-600' : 'bg-red-600'
                          }`}
                          style={{ height: `${height}%` }}
                          title={`Demand: ${(point.parameter_value * 100).toFixed(0)}%, Cost: ${formatCurrency(point.total_cost)}`}
                        ></div>
                        <div className="text-[8px] text-slate-400 mt-1 -rotate-45 origin-left">
                          {(point.parameter_value * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span>Feasible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>Infeasible</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Robustness Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Robustness Metrics</CardTitle>
                <CardDescription>Variance analysis across scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {robustnessMetrics.map(metric => (
                    <div key={metric.metric_name} className="p-4 border rounded-lg">
                      <div className="font-semibold mb-3">{metric.metric_name}</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">Base Value</span>
                          <span className="font-medium">
                            {metric.metric_name.includes('Cost') 
                              ? formatCurrency(metric.base_value)
                              : `${metric.base_value.toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Best Case</span>
                          <span className="font-medium text-green-600">
                            {metric.metric_name.includes('Cost')
                              ? formatCurrency(metric.best_case)
                              : `${metric.best_case.toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Worst Case</span>
                          <span className="font-medium text-red-600">
                            {metric.metric_name.includes('Cost')
                              ? formatCurrency(metric.worst_case)
                              : `${metric.worst_case.toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-slate-300">Variance</span>
                          <span className="font-medium">{(metric.variance * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-green-600">
              <CardHeader>
                <CardTitle className="text-green-400">📊 Analysis Summary & Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-slate-200">
                  <p className="mb-4">
                    Based on the uncertainty analysis across {selectedScenarios.size} scenarios:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>The base case plan is robust</strong> under normal operating conditions 
                      (demand ±15%, cost index ±20%)
                    </li>
                    <li>
                      <strong>Stress test threshold:</strong> The network becomes marginal at 125% demand 
                      combined with 135% cost index
                    </li>
                    <li>
                      <strong>Key risk:</strong> Capacity utilization reaches 98%+ in high-demand scenarios, 
                      leaving little buffer for disruptions
                    </li>
                    <li>
                      <strong>Recommendation:</strong> Maintain the current allocation plan with 
                      pre-positioned contingency agreements for additional transport capacity
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Final Actions */}
        <Card className="bg-slate-900 text-white">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">🎉 Analysis Complete!</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                You have successfully completed the end-to-end Clinker DSS workflow, 
                from network selection through allocation, transportation optimization, 
                and uncertainty analysis.
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  className="bg-slate-800 text-white hover:bg-slate-600"
                  onClick={handleExportFinalReport}
                >
                  📥 Export Final Report
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = '/'}
                >
                  🔄 Start New Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Page 7
          </Button>
        </div>
      </div>
    </div>
  );
}




