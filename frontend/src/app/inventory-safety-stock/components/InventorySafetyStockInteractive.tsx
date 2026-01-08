'use client';

import { useMemo, useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import PeriodSelector, { PeriodOption } from '@/components/common/PeriodSelector';
import NotificationIndicator from '@/components/common/NotificationIndicator';
import InventoryChart from './InventoryChart';
import InventoryStatusCard from './InventoryStatusCard';
import FilterControls from './FilterControls';
import ThresholdAdjustmentPanel from './ThresholdAdjustmentPanel';
import { useInitialData } from '@/lib/useInitialData';

interface InventoryDataPoint {
  period: string;
  inventory: number;
  safetyStock: number;
  criticalThreshold: number;
}

interface UnitInventoryData {
  unitName: string;
  currentStock: number;
  safetyStock: number;
  criticalLevel: number;
  daysOfSupply: number;
  riskLevel: 'healthy' | 'warning' | 'critical';
  unit: string;
  timeSeriesData: InventoryDataPoint[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
}

const InventorySafetyStockInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('monthly');
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'absolute' | 'percentage'>('absolute');

  const { data: initialData, isLoading, error } = useInitialData({
    T: 4,
    limit_plants: 240,
    limit_routes: 250,
    scenario: 'Base',
  });

  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: 'Critical Inventory Alert',
      message: 'GU-East Terminal inventory below critical threshold',
      type: 'error',
      timestamp: '2 hours ago',
      isRead: false,
    },
    {
      id: '2',
      title: 'Safety Stock Warning',
      message: 'IU-North Plant approaching safety stock level',
      type: 'warning',
      timestamp: '5 hours ago',
      isRead: false,
    },
    {
      id: '3',
      title: 'Inventory Replenished',
      message: 'GU-West Terminal stock levels restored to healthy range',
      type: 'success',
      timestamp: '1 day ago',
      isRead: true,
    },
  ];

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const unitInventoryData = useMemo<UnitInventoryData[]>(() => {
    if (!initialData) return [];

    const T = initialData.T;

    const data: UnitInventoryData[] = [];
    for (const p of initialData.plants) {
      const unitName = p.name ? `${p.id} - ${p.name}` : p.id;
      const safetyStock = p.safety_stock;
      const criticalLevel = 0.5 * safetyStock;

      const demandSeries = initialData.demand?.[p.id] ?? Array(T).fill(0);
      const avgDemand = demandSeries.length
        ? demandSeries.reduce((sum, v) => sum + v, 0) / demandSeries.length
        : 0;

      const timeSeries: InventoryDataPoint[] = [];
      let inv = p.initial_inventory;
      for (let t = 1; t <= T; t++) {
        inv = Math.max(0, inv - (demandSeries[t - 1] ?? 0));
        timeSeries.push({
          period: `P${t}`,
          inventory: inv,
          safetyStock,
          criticalThreshold: criticalLevel,
        });
      }

      const currentStock = timeSeries.length ? timeSeries[timeSeries.length - 1].inventory : p.initial_inventory;

      const daysOfSupply = avgDemand > 0 ? Math.round(currentStock / avgDemand) : 999;
      const riskLevel: UnitInventoryData['riskLevel'] =
        currentStock < criticalLevel ? 'critical' : currentStock < safetyStock ? 'warning' : 'healthy';

      data.push({
        unitName,
        currentStock,
        safetyStock,
        criticalLevel,
        daysOfSupply,
        riskLevel,
        unit: selectedMetric === 'percentage' ? '%' : 'MT',
        timeSeriesData: selectedMetric === 'percentage'
          ? timeSeries.map((d) => ({
              ...d,
              inventory: safetyStock > 0 ? (d.inventory / safetyStock) * 100 : 0,
              safetyStock: 100,
              criticalThreshold: safetyStock > 0 ? (criticalLevel / safetyStock) * 100 : 0,
            }))
          : timeSeries,
      });
    }

    return data;
  }, [initialData, selectedMetric]);

  useEffect(() => {
    if (unitInventoryData.length > 0) {
      setSelectedUnits(unitInventoryData.map((u) => u.unitName));
    }
  }, [unitInventoryData.length]);

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 px-lg pb-xl">
          <div className="max-w-7xl mx-auto">
            <div className="h-12 bg-muted rounded w-1/3 mb-8 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const availableUnits = unitInventoryData.map((unit) => unit.unitName);
  const filteredData = unitInventoryData.filter((unit) =>
    selectedUnits.includes(unit.unitName)
  );

  const handleThresholdAdjust = (
    unitName: string,
    safetyStock: number,
    criticalLevel: number
  ) => {
    console.log(`Adjusting thresholds for ${unitName}:`, { safetyStock, criticalLevel });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 px-lg pb-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 animate-entrance">
            <div>
              <h1 className="font-heading font-bold text-4xl text-foreground mb-2">
                Inventory & Safety Stock Intelligence
              </h1>
              <p className="font-body text-base text-muted-foreground">
                Monitor inventory levels, safety stock baselines, and risk thresholds across all manufacturing units
              </p>
            </div>
            <div className="flex items-center gap-3">
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
              <NotificationIndicator notifications={mockNotifications} />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 mb-8 elevation-2 animate-entrance-delay-1 hover:elevation-3 transition-smooth">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <h2 className="font-heading font-semibold text-2xl text-foreground">
                Current Inventory Status
              </h2>
              <ThresholdAdjustmentPanel
                unitName="All Units"
                currentSafetyStock={
                  unitInventoryData.length
                    ? Math.round(unitInventoryData.reduce((sum, u) => sum + (selectedMetric === 'percentage' ? 100 : u.safetyStock), 0) / unitInventoryData.length)
                    : 0
                }
                currentCriticalLevel={
                  unitInventoryData.length
                    ? Math.round(unitInventoryData.reduce((sum, u) => sum + (selectedMetric === 'percentage' ? 50 : u.criticalLevel), 0) / unitInventoryData.length)
                    : 0
                }
                unit={selectedMetric === 'percentage' ? '%' : 'MT'}
                onAdjust={(safety, critical) => {
                  // Handle global threshold adjustment
                }}
              />
            </div>

            {error && (
              <div className="mb-6 p-4 bg-card border border-border rounded-lg">
                <p className="font-body text-sm text-error">Failed to load initial data: {error.message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {unitInventoryData.slice(0, 8).map((unit, index) => (
                <div key={unit.unitName} className={`animate-entrance-delay-${Math.min(index + 1, 4)}`}>
                  <InventoryStatusCard
                    unitName={unit.unitName}
                    currentStock={unit.currentStock}
                    safetyStock={unit.safetyStock}
                    daysOfSupply={unit.daysOfSupply}
                    riskLevel={unit.riskLevel}
                    unit={unit.unit}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 elevation-2 animate-entrance-delay-2 hover:elevation-3 transition-smooth">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <h2 className="font-heading font-semibold text-2xl text-foreground">
                Time-Series Inventory Analysis
              </h2>
              <FilterControls
                selectedUnits={selectedUnits}
                availableUnits={availableUnits}
                selectedMetric={selectedMetric}
                onUnitChange={setSelectedUnits}
                onMetricChange={setSelectedMetric}
              />
            </div>

            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="font-body text-base text-muted-foreground text-center">
                  No units selected. Please select at least one unit to view inventory data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredData.map((unit) => (
                  <InventoryChart
                    key={unit.unitName}
                    unitName={unit.unitName}
                    data={unit.timeSeriesData}
                    currentLevel={unit.currentStock}
                    safetyStockLevel={unit.safetyStock}
                    criticalLevel={unit.criticalLevel}
                    unit={unit.unit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InventorySafetyStockInteractive;