'use client';

import Icon from '@/components/ui/AppIcon';

interface CostMetric {
  label: string;
  value: number;
  unit: string;
  change: number;
  icon: string;
}

interface CostAnalysisPanelProps {
  metrics: CostMetric[];
  className?: string;
}

const CostAnalysisPanel = ({
  metrics,
  className = '',
}: CostAnalysisPanelProps) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 p-4 bg-card border border-border rounded-lg transition-smooth hover:shadow-md interactive-lift"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-md">
                <Icon
                  name={metric.icon as any}
                  size={20}
                  className="text-primary"
                />
              </div>
              <span className="font-caption text-xs text-muted-foreground uppercase tracking-wide">
                {metric.label}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                metric.change >= 0
                  ? 'bg-success/10 text-success' :'bg-error/10 text-error'
              }`}
            >
              <Icon
                name={metric.change >= 0 ? 'ArrowUpIcon' : 'ArrowDownIcon'}
                size={14}
              />
              <span className="font-data text-xs font-medium">
                {Math.abs(metric.change)}%
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-semibold text-foreground">
              {metric.value.toLocaleString()}
            </span>
            <span className="font-body text-sm text-muted-foreground">
              {metric.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CostAnalysisPanel;