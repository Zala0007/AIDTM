'use client';

import Icon from '@/components/ui/AppIcon';

interface EnvironmentalImpactPanelProps {
  totalEmissions: number;
  avgCarbonIntensity: number;
  dataCount: number;
}

const EnvironmentalImpactPanel = ({
  totalEmissions,
  avgCarbonIntensity,
  dataCount,
}: EnvironmentalImpactPanelProps) => {
  const emissionReductionTarget = 0.15;
  const currentProgress = 0.08;
  const progressPercentage = (currentProgress / emissionReductionTarget) * 100;

  const sustainabilityScore = Math.max(
    0,
    Math.min(100, 100 - avgCarbonIntensity * 150)
  );

  const metrics = [
    {
      label: 'Total Emissions',
      value: (totalEmissions / 1000).toFixed(1),
      unit: 'tons CO₂',
      icon: 'CloudIcon',
      trend: -3.2,
    },
    {
      label: 'Carbon Intensity',
      value: avgCarbonIntensity.toFixed(3),
      unit: 'kg CO₂/ton-km',
      icon: 'ChartBarIcon',
      trend: -5.1,
    },
    {
      label: 'Active Routes',
      value: dataCount.toString(),
      unit: 'routes',
      icon: 'MapIcon',
      trend: 0,
    },
    {
      label: 'Sustainability Score',
      value: sustainabilityScore.toFixed(0),
      unit: '/100',
      icon: 'SparklesIcon',
      trend: 2.4,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1">
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
          Environmental Impact Metrics
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Sustainability KPIs and trend analysis
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-background rounded-md border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Icon name={metric.icon as any} size={20} className="text-foreground" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">{metric.label}</p>
                <p className="font-data text-lg font-semibold text-foreground">
                  {metric.value}
                  <span className="font-body text-xs text-muted-foreground ml-1">
                    {metric.unit}
                  </span>
                </p>
              </div>
            </div>
            {metric.trend !== 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                  metric.trend > 0 ? 'bg-success/10' : 'bg-destructive/10'
                }`}
              >
                <Icon
                  name={metric.trend > 0 ? 'ArrowUpIcon' : 'ArrowDownIcon'}
                  size={14}
                  className={metric.trend > 0 ? 'text-success' : 'text-destructive'}
                />
                <span
                  className={`font-data text-xs font-medium ${
                    metric.trend > 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {Math.abs(metric.trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-sm text-muted-foreground">
            Emission Reduction Progress
          </span>
          <span className="font-data text-sm font-medium text-foreground">
            {(currentProgress * 100).toFixed(1)}% / {(emissionReductionTarget * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="font-caption text-xs text-muted-foreground mt-2">
          Target: 15% reduction by Q4 2026
        </p>
      </div>
    </div>
  );
};

export default EnvironmentalImpactPanel;
