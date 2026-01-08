'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface OptimizationResult {
  total_cost: number;
  cost_breakdown?: {
    production?: number;
    transport?: number;
    holding?: number;
  };
  summary?: {
    total_production: number;
    total_transport: number;
    avg_inventory_utilization: number;
    num_active_routes: number;
  };
  plant_metrics?: Record<
    string,
    {
      total_production: number;
      avg_inventory: number;
      capacity_utilization: number;
    }
  >;
  period_metrics?: Record<
    string,
    {
      production: number;
      transport: number;
      num_trips: number;
    }
  >;
}

const AdvancedOptimizationInteractive = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'analytics'>('upload');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

  const tabs = [
    { id: 'upload' as const, label: 'CSV Upload & Optimize', icon: 'database' },
    { id: 'generate' as const, label: 'Generate Training Data', icon: 'cpu-chip' },
    { id: 'analytics' as const, label: 'Results Analytics', icon: 'chart-bar' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon name="cpu-chip" className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Advanced OR Platform</h1>
        </div>
        <p className="text-muted-foreground">
          Industry-grade MILP optimization with intelligent data generation and comprehensive analytics
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-accent text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon name={tab.icon} className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Icon name="arrow-up-tray" className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload CSV Files</h3>
              <p className="text-gray-500 mb-6">
                Upload your clinker supply chain data files for advanced MILP optimization
              </p>
              <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="font-medium mb-2">Required Files:</p>
                <ul className="text-left space-y-1">
                  <li>• IUGU Type mapping (IU-GU relationships)</li>
                  <li>• Opening & Closing Stock levels</li>
                  <li>• Production Costs & Capacities</li>
                  <li>• Clinker Demand forecasts</li>
                  <li>• Logistics & Transport constraints</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Icon name="sparkles" className="w-16 h-16 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Generate Training Data</h3>
              <p className="text-gray-500 mb-6">
                Create realistic synthetic datasets for model training and testing
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-left">
                  <h4 className="font-semibold text-blue-900 mb-2">Balanced Scenario</h4>
                  <p className="text-sm text-blue-700">
                    Optimal capacity-demand ratio with predictable patterns
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-left">
                  <h4 className="font-semibold text-orange-900 mb-2">High Demand</h4>
                  <p className="text-sm text-orange-700">
                    Stress-test with peak demand and tight constraints
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-left">
                  <h4 className="font-semibold text-green-900 mb-2">Capacity Constrained</h4>
                  <p className="text-sm text-green-700">
                    Limited production with strategic allocation needs
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-left">
                  <h4 className="font-semibold text-purple-900 mb-2">Strategic</h4>
                  <p className="text-sm text-purple-700">
                    Complex multi-objective optimization scenarios
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {optimizationResult ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Optimization Analytics</h2>

                {/* Cost Analysis */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Cost Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="text-sm text-blue-700 font-medium">Total Cost</div>
                      <div className="text-3xl font-bold text-blue-900 mt-1">
                        $
                        {optimizationResult.total_cost?.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                      <div className="text-sm text-orange-700 font-medium">Production</div>
                      <div className="text-2xl font-bold text-orange-900 mt-1">
                        $
                        {optimizationResult.cost_breakdown?.production?.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        {optimizationResult.cost_breakdown?.production
                          ? (
                              (optimizationResult.cost_breakdown.production /
                                optimizationResult.total_cost) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="text-sm text-green-700 font-medium">Transport</div>
                      <div className="text-2xl font-bold text-green-900 mt-1">
                        $
                        {optimizationResult.cost_breakdown?.transport?.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {optimizationResult.cost_breakdown?.transport
                          ? (
                              (optimizationResult.cost_breakdown.transport /
                                optimizationResult.total_cost) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <div className="text-sm text-purple-700 font-medium">Holding</div>
                      <div className="text-2xl font-bold text-purple-900 mt-1">
                        $
                        {optimizationResult.cost_breakdown?.holding?.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        {optimizationResult.cost_breakdown?.holding
                          ? (
                              (optimizationResult.cost_breakdown.holding /
                                optimizationResult.total_cost) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operations Summary */}
                {optimizationResult.summary && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Operations Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Total Production</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {optimizationResult.summary.total_production?.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">tons</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Total Transport</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {optimizationResult.summary.total_transport?.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">tons</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Inventory Utilization</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {(optimizationResult.summary.avg_inventory_utilization * 100)?.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">average</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Active Routes</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {optimizationResult.summary.num_active_routes}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">routes used</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plant Metrics */}
                {optimizationResult.plant_metrics && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Plant Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Plant ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Production
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg Inventory
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Capacity Utilization
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(optimizationResult.plant_metrics)
                            .slice(0, 10)
                            .map(([plantId, metrics]) => (
                              <tr key={plantId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {plantId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {metrics.total_production?.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {metrics.avg_inventory?.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{
                                          width: `${(metrics.capacity_utilization * 100).toFixed(0)}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-600">
                                      {(metrics.capacity_utilization * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Period Metrics */}
                {optimizationResult.period_metrics && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Period Analysis</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {Object.entries(optimizationResult.period_metrics).map(([period, metrics]) => (
                        <div key={period} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-2">Period {period}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Prod:</span>
                              <span className="font-semibold text-gray-900">
                                {metrics.production?.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Trans:</span>
                              <span className="font-semibold text-gray-900">
                                {metrics.transport?.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Trips:</span>
                              <span className="font-semibold text-gray-900">{metrics.num_trips}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Icon name="chart-bar" className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Results Yet</h3>
                <p className="text-gray-500">
                  Upload your CSV files and run optimization to see detailed analytics here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Icon name="database" className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete MILP Model</h3>
          <p className="text-sm text-gray-600">
            Full implementation with mass balance, integer constraints, inventory thresholds, and strategic
            planning
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Icon name="cpu-chip" className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Intelligent Data Generation</h3>
          <p className="text-sm text-gray-600">
            Create realistic datasets with proper correlations, seasonality, and business logic for
            training
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Icon name="chart-bar" className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
          <p className="text-sm text-gray-600">
            Comprehensive diagnostics with cost breakdown, plant metrics, and period-level analysis
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOptimizationInteractive;
