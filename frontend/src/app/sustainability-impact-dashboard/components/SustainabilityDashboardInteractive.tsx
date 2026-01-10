'use client';

import { useState, useEffect } from 'react';
import PeriodSelector, { PeriodOption } from '@/components/common/PeriodSelector';
import { fetchSustainabilityData, TransportDataPoint } from '@/lib/optimizerApi';
import TransportEmissionsPanel from './TransportEmissionsPanel';
import CostCarbonBalancePanel from './CostCarbonBalancePanel';
import EnvironmentalImpactPanel from './EnvironmentalImpactPanel';
import EmissionScenarioComparison from './EmissionScenarioComparison';
import Icon from '@/components/ui/AppIcon';

interface SustainabilityDashboardInteractiveProps {
  initialData: TransportDataPoint[];
}

const SustainabilityDashboardInteractive = ({
  initialData,
}: SustainabilityDashboardInteractiveProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('monthly');
  const [selectedModes, setSelectedModes] = useState<string[]>(['rail', 'road', 'multimodal']);
  const [emissionThreshold, setEmissionThreshold] = useState(60000);
  const [data, setData] = useState<TransportDataPoint[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchSustainabilityData(selectedPeriod);
        // Backend returns {success: true, data: {period: "monthly", data: [...]}}
        // We need to extract the inner data array
        const dataArray = response.data?.data || response.data || [];
        setData(Array.isArray(dataArray) ? dataArray : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        // Error is already captured in state for UI display
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod]);

  const filteredData = Array.isArray(data) ? data.filter((item) =>
    selectedModes.includes(item.mode)
  ) : [];

  const totalEmissions = filteredData.reduce((sum, item) => sum + item.totalEmissions, 0);
  const totalCost = filteredData.reduce((sum, item) => sum + item.cost, 0);
  const avgCarbonIntensity = filteredData.length > 0
    ? filteredData.reduce((sum, item) => sum + item.carbonIntensity, 0) / filteredData.length
    : 0;

  const handleModeToggle = (mode: string) => {
    if (selectedModes.includes(mode)) {
      if (selectedModes.length > 1) {
        setSelectedModes(selectedModes.filter((m) => m !== mode));
      }
    } else {
      setSelectedModes([...selectedModes, mode]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-3xl text-foreground mb-2">
            Sustainability Impact Dashboard
          </h1>
          <p className="font-body text-base text-muted-foreground">
            Environmental compliance analysis and carbon footprint optimization
          </p>
        </div>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive font-body font-medium text-sm">
            <Icon name="ExclamationTriangleIcon" size={18} />
            <span>Failed to load data: {error}</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <span className="font-body text-sm">Loading {selectedPeriod} data...</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-lg p-4">
        <span className="font-body font-medium text-sm text-muted-foreground">
          Transport Modes:
        </span>
        {['rail', 'road', 'multimodal'].map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeToggle(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-body font-medium text-sm transition-smooth focus-ring ${
              selectedModes.includes(mode)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <Icon
              name={mode === 'rail' ? 'TruckIcon' : mode === 'road' ? 'TruckIcon' : 'MapIcon'}
              size={16}
            />
            <span className="capitalize">{mode}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TransportEmissionsPanel data={filteredData} />
        <CostCarbonBalancePanel
          data={filteredData}
          emissionThreshold={emissionThreshold}
          onThresholdChange={setEmissionThreshold}
        />
        <EnvironmentalImpactPanel
          totalEmissions={totalEmissions}
          avgCarbonIntensity={avgCarbonIntensity}
          dataCount={filteredData.length}
        />
      </div>

      <EmissionScenarioComparison
        currentData={filteredData}
        emissionThreshold={emissionThreshold}
      />
    </div>
  );
};

export default SustainabilityDashboardInteractive;
