'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ScenarioCard from './ScenarioCard';
import CostServiceChart from './CostServiceChart';
import RiskExposureIndicator from './RiskExposureIndicator';
import ScenarioComparison from './ScenarioComparison';
import Icon from '@/components/ui/AppIcon';
import { useInitialData } from '@/lib/useInitialData';
import { optimizeWithConstraintsUpload } from '@/lib/optimizerApi';

interface ScenarioMetrics {
  totalDemand: number;
  demandChange: number;
  serviceLevel: number;
  serviceLevelChange: number;
  riskExposure: 'low' | 'medium' | 'high' | 'critical';
  inventoryTurnover: number;
  transportEfficiency: number;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  metrics: ScenarioMetrics;
}

interface DataPoint {
  scenario: string;
  demand: number;
  serviceLevel: number;
  riskScore: number;
}

interface RiskMetric {
  category: string;
  currentLevel: number;
  threshold: number;
  status: 'safe' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface ComparisonMetric {
  label: string;
  baseValue: number;
  compareValue: number;
  unit: string;
  format: 'currency' | 'percentage' | 'number';
}

interface ScenarioParameters {
  demandMultiplier: number; // 0.85..1.25
  serviceLevelDelta: number; // -3..+3
  disruptionFactor: number; // 0..1
}
const ScenarioRiskInteractive = () => {
  const { data: initialData, isLoading, error } = useInitialData({ T: 4, limit_plants: 260, limit_routes: 400, scenario: 'Base' });
  const [activeScenario, setActiveScenario] = useState('base');
  const [compareScenario, setCompareScenario] = useState('');

  const baselineRef = useRef<Scenario[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([]);

  const [params, setParams] = useState<ScenarioParameters>({
    demandMultiplier: 1.0,
    serviceLevelDelta: 0,
    disruptionFactor: 0.25,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [constraintFile, setConstraintFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [constraintResult, setConstraintResult] = useState<{
    status: string;
    totalCost: number | null;
    trips: number;
  } | null>(null);

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isParametersOpen, setIsParametersOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const activeScenarioData = scenarios.find((s) => s.id === activeScenario);
  const compareScenarioData = scenarios.find((s) => s.id === compareScenario);

  const datasetStats = useMemo(() => {
    if (!initialData) return null;

    const demandValues: number[] = [];
    const periodDemand: number[] = Array.from({ length: initialData.T }, () => 0);

    Object.values(initialData.demand).forEach((series) => {
      series.forEach((val, idx) => {
        demandValues.push(val);
        periodDemand[idx] = (periodDemand[idx] || 0) + val;
      });
    });

    const totalDemand = demandValues.reduce((a, b) => a + b, 0);
    const avgDemandPerPlant = initialData.plants.length ? totalDemand / initialData.plants.length : 0;

    let totalCapacity = 0;
    initialData.plants.forEach((p) => {
      if (typeof p.max_capacity === 'number') totalCapacity += p.max_capacity;
    });

    const iuCount = initialData.plants.filter((p) => p.type === 'IU').length;
    const guCount = initialData.plants.filter((p) => p.type === 'GU').length;

    const modeCosts: number[] = [];
    const capacities: number[] = [];
    initialData.routes.forEach((r) => {
      r.modes.forEach((m) => {
        modeCosts.push(m.unit_cost);
        capacities.push(m.capacity_per_trip);
      });
    });

    const avgFreight = modeCosts.length
      ? modeCosts.reduce((a, b) => a + b, 0) / modeCosts.length
      : 0;
    const avgTripCapacity = capacities.length
      ? capacities.reduce((a, b) => a + b, 0) / capacities.length
      : 0;

    return {
      totalDemand,
      periodDemand,
      avgDemandPerPlant,
      iuCount,
      guCount,
      totalRoutes: initialData.routes.length,
      avgFreight,
      avgTripCapacity,
      totalCapacity,
    };
  }, [initialData]);

  const generateScenarios = (stats: NonNullable<typeof datasetStats>): Scenario[] => {
    const baseService = 96 - Math.min(5, stats.guCount * 0.05);

    const makeScenario = (
      id: string,
      title: string,
      description: string,
      demandFactor: number,
      disruption: number,
      exposure: ScenarioMetrics['riskExposure']
    ): Scenario => {
      const totalDemand = stats.totalDemand * demandFactor;
      const demandChange = (demandFactor - 1) * 100;
      const serviceLevel = Math.min(99.5, Math.max(90, baseService - disruption * 8 + (demandFactor < 1 ? 1.2 : -0.8)));
      const serviceLevelChange = serviceLevel - baseService;
      const inventoryTurnover = Math.max(4, Math.min(14, (stats.iuCount || 1) * 0.35 + (100 - disruption * 20) / 15));
      const transportEfficiency = Math.max(60, Math.min(99, 70 + (stats.avgTripCapacity ? Math.log10(stats.avgTripCapacity + 1) * 8 : 0) - disruption * 12));

      return {
        id,
        title,
        description,
        metrics: {
          totalDemand,
          demandChange,
          serviceLevel,
          serviceLevelChange,
          riskExposure: exposure,
          inventoryTurnover: Number(inventoryTurnover.toFixed(1)),
          transportEfficiency: Number(transportEfficiency.toFixed(1)),
        },
      };
    };

    return [
      makeScenario('base', 'Base Scenario', 'Current demand profile from ClinkerDemand.csv', 1.0, 0.15, 'low'),
      makeScenario('peak', 'Peak Demand', '15% uplift on demand volumes', 1.15, 0.22, 'medium'),
      makeScenario('efficiency', 'Efficiency Focus', '8% demand reduction with IU/GU balancing', 0.92, 0.08, 'low'),
      makeScenario('disruption', 'Disruption Scenario', 'Routing stress-test with higher risk factor', 1.05, 0.35, 'high'),
    ];
  };

  const generateRiskMetrics = (stats: NonNullable<typeof datasetStats>): RiskMetric[] => {
    const coverage = stats.totalCapacity > 0 ? (stats.totalDemand / stats.totalCapacity) * 100 : 75;
    const transportLoad = stats.avgTripCapacity > 0 ? Math.min(100, (stats.avgDemandPerPlant / stats.avgTripCapacity) * 10) : 65;
    const costSpread = Math.min(100, stats.avgFreight ? (stats.avgFreight / (stats.avgFreight + 1)) * 120 : 20);
    return [
      {
        category: 'Inventory Coverage',
        currentLevel: Number(coverage.toFixed(1)),
        threshold: 110,
        status: coverage >= 100 ? 'warning' : 'safe',
        trend: coverage >= 95 ? 'up' : 'stable',
      },
      {
        category: 'Transportation Capacity',
        currentLevel: Number(transportLoad.toFixed(1)),
        threshold: 90,
        status: transportLoad >= 90 ? 'warning' : 'safe',
        trend: transportLoad >= 85 ? 'up' : 'stable',
      },
      {
        category: 'Cost Variance',
        currentLevel: Number(costSpread.toFixed(1)),
        threshold: 120,
        status: costSpread >= 95 ? 'warning' : 'safe',
        trend: 'stable',
      },
      {
        category: 'Service Level Deviation',
        currentLevel: 100 - Math.min(10, stats.guCount * 0.08),
        threshold: 100,
        status: 'safe',
        trend: 'down',
      },
    ];
  };

  useEffect(() => {
    if (!datasetStats) return;
    const generated = generateScenarios(datasetStats);
    baselineRef.current = generated;
    setScenarios(generated);
    setRiskMetrics(generateRiskMetrics(datasetStats));
    setActiveScenario(generated[0]?.id ?? 'base');
    setCompareScenario(generated[1]?.id ?? generated[0]?.id ?? 'base');
  }, [datasetStats]);

  const chartData = useMemo<DataPoint[]>(() => {
    const riskScoreFor = (risk: ScenarioMetrics['riskExposure']) => {
      switch (risk) {
        case 'low':
          return 25;
        case 'medium':
          return 45;
        case 'high':
          return 65;
        case 'critical':
          return 85;
        default:
          return 40;
      }
    };

    return scenarios.map((s) => ({
      scenario: s.title,
      demand: s.metrics.totalDemand,
      serviceLevel: s.metrics.serviceLevel,
      riskScore: riskScoreFor(s.metrics.riskExposure),
    }));
  }, [scenarios]);

  const getComparisonMetrics = (): ComparisonMetric[] => {
    if (!activeScenarioData || !compareScenarioData) return [];

    return [
      {
        label: 'Total Demand',
        baseValue: activeScenarioData.metrics.totalDemand,
        compareValue: compareScenarioData.metrics.totalDemand,
        unit: ' tons',
        format: 'number',
      },
      {
        label: 'Service Level',
        baseValue: activeScenarioData.metrics.serviceLevel,
        compareValue: compareScenarioData.metrics.serviceLevel,
        unit: '%',
        format: 'percentage',
      },
      {
        label: 'Inventory Turnover',
        baseValue: activeScenarioData.metrics.inventoryTurnover,
        compareValue: compareScenarioData.metrics.inventoryTurnover,
        unit: 'x',
        format: 'number',
      },
      {
        label: 'Transport Efficiency',
        baseValue: activeScenarioData.metrics.transportEfficiency,
        compareValue: compareScenarioData.metrics.transportEfficiency,
        unit: '%',
        format: 'percentage',
      },
    ];
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setActionMessage(null);

    // Simulate compute latency (keeps UI responsive and gives feedback)
    await new Promise((r) => setTimeout(r, 450));

    const nextScenarios = scenarios.map((s) => {
      const baseline = baselineRef.current.find((b) => b.id === s.id) ?? s;
      const baseDemand = baseline.metrics.totalDemand;
      const baseService = baseline.metrics.serviceLevel;

      // Apply a simple, consistent transformation based on parameters.
      // This keeps charts/cards/indicators in sync without introducing new pages/modals.
      const riskWeight =
        s.metrics.riskExposure === 'critical'
          ? 1.0
          : s.metrics.riskExposure === 'high'
          ? 0.7
          : s.metrics.riskExposure === 'medium'
          ? 0.45
          : 0.25;

      const costFactor = params.demandMultiplier * (1 + params.disruptionFactor * 0.12 * riskWeight);
      const serviceDelta = params.serviceLevelDelta - params.disruptionFactor * 1.6 * riskWeight;

      const newTotalDemand = Math.round(baseDemand * costFactor);
      const newServiceLevel = clamp(baseService + serviceDelta, 90, 99.8);

      const newInventoryTurnover = clamp(
        baseline.metrics.inventoryTurnover * (1 + (params.serviceLevelDelta / 40) - params.disruptionFactor * 0.06),
        4,
        14
      );
      const newTransportEfficiency = clamp(
        baseline.metrics.transportEfficiency + (params.serviceLevelDelta * 0.35) - params.disruptionFactor * 6.0,
        60,
        99
      );

      const demandChange = ((newTotalDemand - baseDemand) / baseDemand) * 100;
      const serviceLevelChange = newServiceLevel - baseService;

      return {
        ...s,
        metrics: {
          ...s.metrics,
          totalDemand: newTotalDemand,
          serviceLevel: newServiceLevel,
          inventoryTurnover: Number(newInventoryTurnover.toFixed(1)),
          transportEfficiency: Number(newTransportEfficiency.toFixed(1)),
          demandChange: Number(demandChange.toFixed(1)),
          serviceLevelChange: Number(serviceLevelChange.toFixed(1)),
        },
      };
    });

    setScenarios(nextScenarios);

    // Update risk indicators in a way that reflects the current scenario + parameters.
    const riskAmplifier = clamp(params.disruptionFactor, 0, 1);
    setRiskMetrics((prev) =>
      prev.map((m) => {
        const bump = m.category.includes('Transportation') ? 14 : m.category.includes('Inventory') ? 10 : 6;
        const current = clamp(m.currentLevel + bump * (riskAmplifier - 0.25), 0, m.threshold * 1.2);
        const pct = (current / m.threshold) * 100;
        const status: RiskMetric['status'] = pct >= 95 ? 'critical' : pct >= 85 ? 'warning' : 'safe';
        const trend: RiskMetric['trend'] = riskAmplifier > 0.35 ? 'up' : riskAmplifier < 0.2 ? 'down' : 'stable';
        return { ...m, currentLevel: Number(current.toFixed(1)), status, trend };
      })
    );

    setActionMessage('Scenario metrics recalculated using current parameters.');
    setIsRecalculating(false);
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeScenario,
      compareScenario,
      parameters: params,
      scenarios,
      chartData,
      riskMetrics,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-analysis-${activeScenario}-vs-${compareScenario}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setActionMessage('Export generated for current analysis state.');
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border elevation-1">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-80 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-error">
        Failed to load scenario data: {error.message}
      </div>
    );
  }

  if (!initialData || !scenarios.length) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-muted-foreground">
        No scenario data available. Upload ClinkerDemand.csv in real_data to view scenarios.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-foreground mb-1">
            Scenario Analysis
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            Live demand-driven scenarios (tons) derived from ClinkerDemand.csv
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen((v) => !v)}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-accent/90"
        >
          <Icon name="PlusIcon" size={18} />
          {isCreateOpen ? 'Close' : 'Create Scenario'}
        </button>
      </div>

      {isCreateOpen && (
        <div className="bg-card border border-border rounded-lg p-4 elevation-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-heading font-semibold text-base text-foreground">Upload constraint CSV</p>
              <p className="font-body text-sm text-muted-foreground">
                Blank TRANSPORT CODE is applied to both T1 and T2; missing IUGU CODE applies across destinations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setConstraintFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <button
                onClick={async () => {
                  if (!constraintFile || !initialData) {
                    setActionMessage('Select a constraint CSV and ensure data is loaded.');
                    return;
                  }
                  try {
                    setIsUploading(true);
                    setActionMessage(null);
                    const result = await optimizeWithConstraintsUpload({
                      file: constraintFile,
                      scenario: initialData.scenario,
                      T: initialData.T,
                      limit_plants: initialData.limits?.plants ?? 260,
                      limit_routes: initialData.limits?.routes ?? 400,
                      seed: 42,
                    });
                    setConstraintResult({
                      status: result.status,
                      totalCost: result.total_cost ?? null,
                      trips: result.scheduled_trips?.length ?? 0,
                    });
                    setActionMessage(result.message || `Constraint run: ${result.status}`);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Constraint upload failed';
                    setActionMessage(msg);
                  } finally {
                    setIsUploading(false);
                  }
                }}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Icon name={isUploading ? 'ArrowPathIcon' : 'CloudArrowUpIcon'} size={16} className={isUploading ? 'animate-spin' : ''} />
                {isUploading ? 'Uploading…' : 'Run with constraints'}
              </button>
            </div>
          </div>
          {constraintFile && (
            <p className="mt-2 font-caption text-xs text-muted-foreground">
              Selected: {constraintFile.name}
            </p>
          )}
          {constraintResult && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-background border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Constraint status</p>
                <p className="font-body text-sm font-semibold text-foreground">{constraintResult.status}</p>
              </div>
              <div className="bg-background border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Total cost</p>
                <p className="font-body text-sm font-semibold text-foreground">
                  {constraintResult.totalCost !== null ? Math.round(constraintResult.totalCost).toLocaleString() : 'n/a'}
                </p>
              </div>
              <div className="bg-background border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Scheduled trips</p>
                <p className="font-body text-sm font-semibold text-foreground">{constraintResult.trips}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-md p-3">
          <p className="font-caption text-xs text-muted-foreground">IU : GU</p>
          <p className="font-data text-sm font-semibold text-foreground">{datasetStats?.iuCount ?? 0} : {datasetStats?.guCount ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="font-caption text-xs text-muted-foreground">Routes</p>
          <p className="font-data text-sm font-semibold text-foreground">{datasetStats?.totalRoutes ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="font-caption text-xs text-muted-foreground">Avg Freight Cost</p>
          <p className="font-data text-sm font-semibold text-foreground">₹{Math.round(datasetStats?.avgFreight ?? 0).toLocaleString()}/ton</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="font-caption text-xs text-muted-foreground">Avg Trip Capacity</p>
          <p className="font-data text-sm font-semibold text-foreground">{Math.round(datasetStats?.avgTripCapacity ?? 0).toLocaleString()} tons</p>
        </div>
      </div>

      {datasetStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-md p-3">
            <p className="font-caption text-xs text-muted-foreground">Total demand (T periods)</p>
            <p className="font-data text-base font-semibold text-foreground">{Math.round(datasetStats.totalDemand).toLocaleString()} tons</p>
          </div>
          <div className="bg-card border border-border rounded-md p-3">
            <p className="font-caption text-xs text-muted-foreground">Network capacity</p>
            <p className="font-data text-base font-semibold text-foreground">{Math.round(datasetStats.totalCapacity).toLocaleString()} tons</p>
          </div>
          <div className="bg-card border border-border rounded-md p-3">
            <p className="font-caption text-xs text-muted-foreground">Avg freight (all modes)</p>
            <p className="font-data text-base font-semibold text-foreground">₹{Math.round(datasetStats.avgFreight).toLocaleString()}/ton</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            title={scenario.title}
            description={scenario.description}
            metrics={scenario.metrics}
            isActive={activeScenario === scenario.id}
            onSelect={() => setActiveScenario(scenario.id)}
          />
        ))}
      </div>

      <CostServiceChart data={chartData} activeScenario={scenarios.find((s) => s.id === activeScenario)?.title || ''} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskExposureIndicator metrics={riskMetrics} />
        <ScenarioComparison
          baseScenario={activeScenarioData?.title || ''}
          compareScenario={compareScenarioData?.title || ''}
          metrics={getComparisonMetrics()}
        />
      </div>

      <div className="bg-card rounded-lg p-6 border border-border elevation-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg text-foreground">
            Scenario Actions
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="ArrowPathIcon" size={16} />
            {isRecalculating ? 'Recalculating…' : 'Recalculate'}
          </button>
          <button
            onClick={handleExport}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="DocumentArrowDownIcon" size={16} />
            Export Analysis
          </button>
          <button
            onClick={() => {
              setIsParametersOpen((v) => !v);
              setIsDetailsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-muted"
          >
            <Icon name="Cog6ToothIcon" size={16} />
            {isParametersOpen ? 'Hide Parameters' : 'Adjust Parameters'}
          </button>
          <button
            onClick={() => {
              setIsDetailsOpen((v) => !v);
              setIsParametersOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring hover:bg-muted"
          >
            <Icon name="ChartBarIcon" size={16} />
            {isDetailsOpen ? 'Hide Details' : 'View Details'}
          </button>
        </div>

        {actionMessage && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
            <Icon name="InformationCircleIcon" size={16} className="text-muted-foreground" />
            <span className="font-caption text-xs text-muted-foreground">{actionMessage}</span>
          </div>
        )}

        {isParametersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background border border-border rounded-md p-4">
              <p className="font-body font-medium text-sm text-foreground mb-2">Demand Multiplier</p>
              <input
                type="range"
                min={0.85}
                max={1.25}
                step={0.01}
                value={params.demandMultiplier}
                onChange={(e) => setParams((p) => ({ ...p, demandMultiplier: Number(e.target.value) }))}
                className="w-full"
              />
              <p className="font-caption text-xs text-muted-foreground mt-2">{params.demandMultiplier.toFixed(2)}×</p>
            </div>

            <div className="bg-background border border-border rounded-md p-4">
              <p className="font-body font-medium text-sm text-foreground mb-2">Service Level Delta</p>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.1}
                value={params.serviceLevelDelta}
                onChange={(e) => setParams((p) => ({ ...p, serviceLevelDelta: Number(e.target.value) }))}
                className="w-full"
              />
              <p className="font-caption text-xs text-muted-foreground mt-2">{params.serviceLevelDelta.toFixed(1)}%</p>
            </div>

            <div className="bg-background border border-border rounded-md p-4">
              <p className="font-body font-medium text-sm text-foreground mb-2">Disruption Factor</p>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.disruptionFactor}
                onChange={(e) => setParams((p) => ({ ...p, disruptionFactor: Number(e.target.value) }))}
                className="w-full"
              />
              <p className="font-caption text-xs text-muted-foreground mt-2">{Math.round(params.disruptionFactor * 100)}%</p>
            </div>
          </div>
        )}

        {isDetailsOpen && (
          <div className="mt-4 bg-background border border-border rounded-md p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading font-semibold text-base text-foreground">
                  {activeScenarioData?.title || 'Scenario'} Details
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  {activeScenarioData?.description || 'Current scenario summary'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-caption text-xs text-muted-foreground">Compare To</p>
                <p className="font-body font-semibold text-sm text-foreground">
                  {compareScenarioData?.title || '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Total Demand</p>
                <p className="font-data text-sm font-semibold text-foreground">
                  {(activeScenarioData?.metrics.totalDemand ?? 0).toLocaleString()} tons
                </p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Service Level</p>
                <p className="font-data text-sm font-semibold text-foreground">
                  {(activeScenarioData?.metrics.serviceLevel ?? 0).toFixed(1)}%
                </p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Inventory Turnover</p>
                <p className="font-data text-sm font-semibold text-foreground">
                  {(activeScenarioData?.metrics.inventoryTurnover ?? 0).toFixed(1)}x
                </p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <p className="font-caption text-xs text-muted-foreground">Transport Efficiency</p>
                <p className="font-data text-sm font-semibold text-foreground">
                  {(activeScenarioData?.metrics.transportEfficiency ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioRiskInteractive;