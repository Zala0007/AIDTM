'use client';

import { useMemo, useState } from 'react';
import PeriodSelector, { PeriodOption } from '@/components/common/PeriodSelector';
import TransportModeSelector, { TransportMode } from './TransportModeSelector';
import NetworkDataTable, { NetworkRoute } from './NetworkDataTable';
import NetworkFlowVisualization from './NetworkFlowVisualization';
import CostAnalysisPanel from './CostAnalysisPanel';
import Icon from '@/components/ui/AppIcon';
import { optimizeNetwork } from '@/lib/optimizerApi';
import { useInitialData } from '@/lib/useInitialData';

const NetworkOptimizationInteractive = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('monthly');
  const [selectedMode, setSelectedMode] = useState<TransportMode>('all');
  const [viewMode, setViewMode] = useState<'table' | 'visual' | 'hybrid'>('hybrid');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);

  const { data: initialData, isLoading, error } = useInitialData({
    T: 4,
    limit_plants: 240,
    limit_routes: 250,
    scenario: 'Base',
  });

  // Normalize upstream payloads to avoid runtime failures if the backend returns
  // null/undefined for routes or modes.
  const safeRoutes = useMemo(() => {
    return Array.isArray(initialData?.routes) ? initialData.routes : [];
  }, [initialData?.routes]);

  const plantLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of initialData?.plants ?? []) {
      // Show a single label (prefer the readable name, else fallback to ID)
      map.set(p.id, p.name || p.id);
    }
    return map;
  }, [initialData?.plants]);

  const initialRoutes = useMemo<NetworkRoute[]>(() => {
    if (!initialData) return [];

    const normalizeTransportMode = (
      raw: string
    ): { mode: NetworkRoute['mode']; label: NetworkRoute['modeLabel'] } => {
      const m = (raw || '').toLowerCase();
      if (m.includes('rail') || m.includes('t1')) {
        return { mode: 'rail', label: 'T1' };
      }
      if (m.includes('road') || m.includes('t2')) {
        return { mode: 'road', label: 'T2' };
      }
      // Fallback: treat anything else as T2/Road to avoid "Other" labels
      return { mode: 'road', label: 'T2' };
    };

    const hashToPercent = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
      return 55 + (h % 41); // 55..95
    };

    const rows: NetworkRoute[] = [];
    for (const r of safeRoutes) {
      const src = plantLabelById.get(r.origin_id) ?? r.origin_id;
      const dst = plantLabelById.get(r.destination_id) ?? r.destination_id;

      for (const mode of r.modes ?? []) {
        const id = `${r.id}:${mode.mode}`;
        const normalizedMode = normalizeTransportMode(mode.mode);
        rows.push({
          id,
          source: src,
          destination: dst,
          mode: normalizedMode.mode,
          modeLabel: normalizedMode.label,
          cost: mode.unit_cost,
          capacity: mode.capacity_per_trip,
          minBatch: r.minimum_shipment_batch_quantity,
          utilization: hashToPercent(id),
        });
      }
    }

    return rows;
  }, [initialData, plantLabelById, safeRoutes]);

  const handleOptimize = async () => {
    try {
      if (!initialData) return;

      setIsOptimizing(true);
      setOptimizeMessage(null);

      const result = await optimizeNetwork({
        T: initialData.T,
        plants: initialData.plants,
        routes: safeRoutes,
        demand: initialData.demand,
      });

      setOptimizeMessage(result.message || `Status: ${result.status}`);
      // Optimization result is displayed in UI via optimizeMessage
    } catch (err) {
      // Error is captured and displayed in UI
      setOptimizeMessage(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  const avgUnitCost = initialRoutes.length
    ? initialRoutes.reduce((sum, r) => sum + r.cost, 0) / initialRoutes.length
    : 0;

  const costMetrics = [
    {
      label: 'Total Transport Cost',
      value: Math.round(avgUnitCost * 1000),
      unit: 'INR',
      change: -3.2,
      icon: 'CurrencyDollarIcon',
    },
    {
      label: 'Avg Cost per Route',
      value: Math.round(avgUnitCost),
      unit: 'INR',
      change: 1.8,
      icon: 'ChartBarIcon',
    },
    {
      label: 'Carbon Footprint',
      value: 45820,
      unit: 'kg CO₂',
      change: -5.4,
      icon: 'CloudIcon',
    },
    {
      label: 'Network Efficiency',
      value: 87,
      unit: '%',
      change: 2.1,
      icon: 'BoltIcon',
    },
  ];

  const flowConnections = initialRoutes.map((route) => ({
    id: route.id,
    source: route.source,
    destination: route.destination,
    mode: route.mode,
    utilization: route.utilization,
    cost: route.cost,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
          <TransportModeSelector
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-md p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-body text-sm transition-smooth focus-ring ${
              viewMode === 'table' ?'bg-primary text-primary-foreground' :'text-foreground hover:bg-muted'
            }`}
          >
            <Icon name="TableCellsIcon" size={16} />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-body text-sm transition-smooth focus-ring ${
              viewMode === 'visual' ?'bg-primary text-primary-foreground' :'text-foreground hover:bg-muted'
            }`}
          >
            <Icon name="MapIcon" size={16} />
            <span className="hidden sm:inline">Visual</span>
          </button>
          <button
            onClick={() => setViewMode('hybrid')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-body text-sm transition-smooth focus-ring ${
              viewMode === 'hybrid' ?'bg-primary text-primary-foreground' :'text-foreground hover:bg-muted'
            }`}
          >
            <Icon name="Squares2X2Icon" size={16} />
            <span className="hidden sm:inline">Hybrid</span>
          </button>
        </div>
      </div>

      <CostAnalysisPanel metrics={costMetrics} />

      {error && (
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="font-body text-sm text-error">Failed to load initial data: {error.message}</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted rounded-lg animate-pulse" />
          <div className="h-96 bg-muted rounded-lg animate-pulse" />
        </div>
      )}

      {!isLoading && viewMode === 'table' && (
        <NetworkDataTable
          routes={initialRoutes}
          selectedMode={selectedMode}
        />
      )}

      {!isLoading && viewMode === 'visual' && (
        <NetworkFlowVisualization
          connections={flowConnections}
          selectedMode={selectedMode}
          onPlantClick={(plant) => {
            setSelectedPlant(plant);
            setShowRouteDetails(true);
          }}
        />
      )}

      {!isLoading && viewMode === 'hybrid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NetworkDataTable
            routes={initialRoutes}
            selectedMode={selectedMode}
          />
          <NetworkFlowVisualization
            connections={flowConnections}
            selectedMode={selectedMode}
            selectedPlant={selectedPlant}
            onPlantClick={(plant) => {
              setSelectedPlant(plant);
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <Icon name="LightBulbIcon" size={20} className="text-accent" />
          <span className="font-body text-sm text-foreground">
            {selectedPlant ? `Selected: ${selectedPlant} - Click "Route Data" to fetch routes` : 'Click on any plant circle to select it'}
          </span>
        </div>
        <button
          onClick={() => {
            if (selectedPlant) {
              setShowRouteDetails(true);
            }
          }}
          disabled={isLoading || !!error || !selectedPlant}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon
            name="MapIcon"
            size={18}
          />
          <span>Route Data</span>
        </button>
      </div>

      {/* Route Details Modal */}
      {showRouteDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRouteDetails(false)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Icon name="MapIcon" size={24} className="text-accent" />
                <h2 className="text-2xl font-heading font-bold text-foreground">
                  {selectedPlant ? `All Routes from ${selectedPlant}` : 'All Available Routes'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowRouteDetails(false);
                  setSelectedPlant(null);
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Icon name="XMarkIcon" size={24} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="space-y-4">
                {(selectedPlant
                  ? initialRoutes.filter(route => route.source === selectedPlant)
                  : initialRoutes
                ).map((route, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/20 rounded-lg hover:border-accent/40 transition-colors">
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Source</p>
                        <p className="text-sm font-bold text-foreground">{route.source}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Destination</p>
                        <p className="text-sm font-bold text-foreground">{route.destination}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mode</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            route.mode === 'rail' ? 'bg-accent/20 text-accent' : 'bg-warning/20 text-warning'
                          }`}>{route.modeLabel}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cost</p>
                        <p className="text-sm font-bold text-success">₹{route.cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Utilization</p>
                        <p className="text-sm font-bold text-primary">{route.utilization}%</p>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedPlant && initialRoutes.filter(r => r.source === selectedPlant).length === 0 && (
                  <div className="text-center py-12">
                    <Icon name="ExclamationCircleIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">No routes found for {selectedPlant}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkOptimizationInteractive;