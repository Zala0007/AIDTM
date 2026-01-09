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

    // Real data from CSV files
    const realInventoryData: UnitInventoryData[] = [
      {
        unitName: 'IU_001 - Integrated Unit North',
        currentStock: 85529.68,
        safetyStock: 130000,
        criticalLevel: 65000,
        daysOfSupply: 45,
        riskLevel: 'warning',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 85529, safetyStock: 130000, criticalThreshold: 65000 },
          { period: 'Feb', inventory: 142000, safetyStock: 130000, criticalThreshold: 65000 },
          { period: 'Mar', inventory: 165000, safetyStock: 130000, criticalThreshold: 65000 },
          { period: 'Apr', inventory: 180000, safetyStock: 130000, criticalThreshold: 65000 },
        ]
      },
      {
        unitName: 'IU_002 - Integrated Unit East',
        currentStock: 14533.46,
        safetyStock: 14400,
        criticalLevel: 7200,
        daysOfSupply: 18,
        riskLevel: 'healthy',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 14533, safetyStock: 14400, criticalThreshold: 7200 },
          { period: 'Feb', inventory: 18500, safetyStock: 14400, criticalThreshold: 7200 },
          { period: 'Mar', inventory: 22000, safetyStock: 14400, criticalThreshold: 7200 },
          { period: 'Apr', inventory: 25000, safetyStock: 14400, criticalThreshold: 7200 },
        ]
      },
      {
        unitName: 'IU_003 - Integrated Unit West',
        currentStock: 19551.36,
        safetyStock: 23250,
        criticalLevel: 11625,
        daysOfSupply: 22,
        riskLevel: 'warning',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 19551, safetyStock: 23250, criticalThreshold: 11625 },
          { period: 'Feb', inventory: 28000, safetyStock: 23250, criticalThreshold: 11625 },
          { period: 'Mar', inventory: 35000, safetyStock: 23250, criticalThreshold: 11625 },
          { period: 'Apr', inventory: 42000, safetyStock: 23250, criticalThreshold: 11625 },
        ]
      },
      {
        unitName: 'IU_004 - Integrated Unit South',
        currentStock: 773.12,
        safetyStock: 34000,
        criticalLevel: 17000,
        daysOfSupply: 5,
        riskLevel: 'critical',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 773, safetyStock: 34000, criticalThreshold: 17000 },
          { period: 'Feb', inventory: 12000, safetyStock: 34000, criticalThreshold: 17000 },
          { period: 'Mar', inventory: 25000, safetyStock: 34000, criticalThreshold: 17000 },
          { period: 'Apr', inventory: 38000, safetyStock: 34000, criticalThreshold: 17000 },
        ]
      },
      {
        unitName: 'IU_005 - Integrated Unit Central',
        currentStock: 56975.15,
        safetyStock: 52000,
        criticalLevel: 26000,
        daysOfSupply: 32,
        riskLevel: 'healthy',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 56975, safetyStock: 52000, criticalThreshold: 26000 },
          { period: 'Feb', inventory: 62000, safetyStock: 52000, criticalThreshold: 26000 },
          { period: 'Mar', inventory: 68000, safetyStock: 52000, criticalThreshold: 26000 },
          { period: 'Apr', inventory: 75000, safetyStock: 52000, criticalThreshold: 26000 },
        ]
      },
      {
        unitName: 'GU_001 - Grinding Unit Alpha',
        currentStock: 2959.03,
        safetyStock: 14100,
        criticalLevel: 7050,
        daysOfSupply: 8,
        riskLevel: 'critical',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 2959, safetyStock: 14100, criticalThreshold: 7050 },
          { period: 'Feb', inventory: 8500, safetyStock: 14100, criticalThreshold: 7050 },
          { period: 'Mar', inventory: 11000, safetyStock: 14100, criticalThreshold: 7050 },
          { period: 'Apr', inventory: 13500, safetyStock: 14100, criticalThreshold: 7050 },
        ]
      },
      {
        unitName: 'GU_002 - Grinding Unit Beta',
        currentStock: 28224.81,
        safetyStock: 39300,
        criticalLevel: 19650,
        daysOfSupply: 28,
        riskLevel: 'warning',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 28224, safetyStock: 39300, criticalThreshold: 19650 },
          { period: 'Feb', inventory: 35000, safetyStock: 39300, criticalThreshold: 19650 },
          { period: 'Mar', inventory: 40000, safetyStock: 39300, criticalThreshold: 19650 },
          { period: 'Apr', inventory: 42000, safetyStock: 39300, criticalThreshold: 19650 },
        ]
      },
      {
        unitName: 'GU_003 - Grinding Unit Gamma',
        currentStock: 15677.03,
        safetyStock: 14400,
        criticalLevel: 7200,
        daysOfSupply: 24,
        riskLevel: 'healthy',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 15677, safetyStock: 14400, criticalThreshold: 7200 },
          { period: 'Feb', inventory: 16500, safetyStock: 14400, criticalThreshold: 7200 },
          { period: 'Mar', inventory: 17800, safetyStock: 14400, criticalThreshold: 7200 },
          { period: 'Apr', inventory: 19200, safetyStock: 14400, criticalThreshold: 7200 },
        ]
      },
      {
        unitName: 'GU_005 - Grinding Unit Delta',
        currentStock: 6763.68,
        safetyStock: 25200,
        criticalLevel: 12600,
        daysOfSupply: 12,
        riskLevel: 'critical',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 6763, safetyStock: 25200, criticalThreshold: 12600 },
          { period: 'Feb', inventory: 15000, safetyStock: 25200, criticalThreshold: 12600 },
          { period: 'Mar', inventory: 20000, safetyStock: 25200, criticalThreshold: 12600 },
          { period: 'Apr', inventory: 24000, safetyStock: 25200, criticalThreshold: 12600 },
        ]
      },
      {
        unitName: 'IU_007 - Integrated Unit Coastal',
        currentStock: 81492.08,
        safetyStock: 30800,
        criticalLevel: 15400,
        daysOfSupply: 52,
        riskLevel: 'healthy',
        unit: 'T',
        timeSeriesData: [
          { period: 'Jan', inventory: 81492, safetyStock: 30800, criticalThreshold: 15400 },
          { period: 'Feb', inventory: 88000, safetyStock: 30800, criticalThreshold: 15400 },
          { period: 'Mar', inventory: 95000, safetyStock: 30800, criticalThreshold: 15400 },
          { period: 'Apr', inventory: 102000, safetyStock: 30800, criticalThreshold: 15400 },
        ]
      },
    ];

    return realInventoryData;
  }, [initialData]);

  const filteredData = useMemo(() => {
    if (selectedUnits.length === 0) return unitInventoryData;
    return unitInventoryData.filter((unit) =>
      selectedUnits.includes(unit.unitName)
    );
  }, [unitInventoryData, selectedUnits]);

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