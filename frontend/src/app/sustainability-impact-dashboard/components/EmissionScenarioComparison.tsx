import { TransportDataPoint } from '@/lib/optimizerApi';
import Icon from '@/components/ui/AppIcon';

interface EmissionScenarioComparisonProps {
  currentData: TransportDataPoint[];
  emissionThreshold: number;
}

const EmissionScenarioComparison = ({
  currentData,
  emissionThreshold,
}: EmissionScenarioComparisonProps) => {
  const currentEmissions = currentData.reduce((sum, item) => sum + item.totalEmissions, 0);
  const currentCost = currentData.reduce((sum, item) => sum + item.cost, 0);

  const scenarios = [
    {
      id: 'current',
      title: 'Current Operations',
      description: 'Existing transportation mix',
      emissions: currentEmissions,
      cost: currentCost,
      emissionChange: 0,
      costChange: 0,
    },
    {
      id: 'rail-priority',
      title: 'Rail Priority',
      description: 'Shift 60% of road transport to rail',
      emissions: currentEmissions * 0.72,
      cost: currentCost * 0.88,
      emissionChange: -28,
      costChange: -12,
    },
    {
      id: 'multimodal-optimization',
      title: 'Multimodal Optimization',
      description: 'Balanced multimodal approach',
      emissions: currentEmissions * 0.82,
      cost: currentCost * 0.94,
      emissionChange: -18,
      costChange: -6,
    },
    {
      id: 'emission-threshold',
      title: 'Emission Threshold Compliance',
      description: 'Routes optimized to meet threshold',
      emissions: emissionThreshold * currentData.length * 0.85,
      cost: currentCost * 1.08,
      emissionChange: -22,
      costChange: 8,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1">
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
          Emission Reduction Scenarios
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Comparative analysis of optimization strategies and cost implications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`p-5 rounded-lg border-2 transition-smooth ${
              scenario.id === 'current' ?'bg-primary/5 border-primary' :'bg-background border-border hover:border-accent/30'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-heading font-semibold text-base text-foreground">
                {scenario.title}
              </h4>
              {scenario.id === 'current' && (
                <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs font-caption font-semibold">
                  CURRENT
                </span>
              )}
            </div>
            <p className="font-body text-xs text-muted-foreground mb-4">
              {scenario.description}
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs text-muted-foreground">Emissions</span>
                  {scenario.emissionChange !== 0 && (
                    <span
                      className={`flex items-center gap-1 font-data text-xs font-medium ${
                        scenario.emissionChange < 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      <Icon
                        name={scenario.emissionChange < 0 ? 'ArrowDownIcon' : 'ArrowUpIcon'}
                        size={12}
                      />
                      {Math.abs(scenario.emissionChange)}%
                    </span>
                  )}
                </div>
                <p className="font-data text-lg font-semibold text-foreground">
                  {(scenario.emissions / 1000).toFixed(1)}
                  <span className="font-body text-xs text-muted-foreground ml-1">
                    tons CO₂
                  </span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs text-muted-foreground">Cost Impact</span>
                  {scenario.costChange !== 0 && (
                    <span
                      className={`flex items-center gap-1 font-data text-xs font-medium ${
                        scenario.costChange < 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      <Icon
                        name={scenario.costChange < 0 ? 'ArrowDownIcon' : 'ArrowUpIcon'}
                        size={12}
                      />
                      {Math.abs(scenario.costChange)}%
                    </span>
                  )}
                </div>
                <p className="font-data text-lg font-semibold text-foreground">
                  ${(scenario.cost / 1000).toFixed(0)}
                  <span className="font-body text-xs text-muted-foreground ml-1">K</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-background border border-border rounded-md font-body font-medium text-sm text-foreground hover:bg-muted transition-smooth focus-ring">
          <Icon name="ArrowDownTrayIcon" size={18} />
          <span>Export Report</span>
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md font-body font-medium text-sm hover:bg-primary/90 transition-smooth focus-ring">
          <Icon name="AdjustmentsHorizontalIcon" size={18} />
          <span>Model Scenarios</span>
        </button>
      </div>
    </div>
  );
};

export default EmissionScenarioComparison;
