import Icon from '@/components/ui/AppIcon';

interface ComparisonMetric {
  label: string;
  baseValue: number;
  compareValue: number;
  unit: string;
  format: 'currency' | 'percentage' | 'number';
}

interface ScenarioComparisonProps {
  baseScenario: string;
  compareScenario: string;
  metrics: ComparisonMetric[];
}

const ScenarioComparison = ({ baseScenario, compareScenario, metrics }: ScenarioComparisonProps) => {
  const formatValue = (value: number, format: string, unit: string) => {
    switch (format) {
      case 'currency':
        return `₹${(value / 1000000).toFixed(2)}M`;
      case 'percentage':
        return `${value.toFixed(1)}${unit}`;
      case 'number':
        if (unit.includes('ton')) {
          return `${value.toLocaleString()}${unit}`;
        }
        return `${value.toFixed(1)}${unit}`;
      default:
        return value.toString();
    }
  };

  const calculateDifference = (base: number, compare: number) => {
    if (base === 0) return 0;
    const diff = ((compare - base) / base) * 100;
    return diff;
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-semibold text-lg text-foreground">
          Scenario Comparison
        </h3>
        <Icon name="ArrowsRightLeftIcon" size={24} className="text-accent" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
        <div className="text-center">
          <p className="font-caption text-xs text-muted-foreground mb-2">
            Base Scenario
          </p>
          <p className="font-body font-semibold text-base text-foreground">
            {baseScenario}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <Icon name="ArrowsRightLeftIcon" size={20} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-caption text-xs text-muted-foreground mb-2">
            Compare To
          </p>
          <p className="font-body font-semibold text-base text-accent">
            {compareScenario}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const difference = calculateDifference(metric.baseValue, metric.compareValue);
          const isPositive = difference > 0;
          const isNegative = difference < 0;

          return (
            <div key={index} className="grid grid-cols-3 gap-4 items-center py-3 border-b border-border last:border-0">
              <div>
                <p className="font-body text-sm text-foreground font-medium">
                  {metric.label}
                </p>
              </div>

              <div className="text-center">
                <p className="font-data text-sm font-semibold text-foreground">
                  {formatValue(metric.baseValue, metric.format, metric.unit)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <p className="font-data text-sm font-semibold text-accent">
                  {formatValue(metric.compareValue, metric.format, metric.unit)}
                </p>
                {difference !== 0 && (
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-caption text-xs font-medium ${
                      isPositive
                        ? 'text-success bg-success/10'
                        : isNegative
                        ? 'text-error bg-error/10' :'text-muted-foreground bg-muted'
                    }`}
                  >
                    <Icon
                      name={isPositive ? 'ArrowUpIcon' : 'ArrowDownIcon'}
                      size={12}
                    />
                    {Math.abs(difference).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScenarioComparison;