import Icon from '@/components/ui/AppIcon';

interface RiskMetric {
  category: string;
  currentLevel: number;
  threshold: number;
  status: 'safe' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface RiskExposureIndicatorProps {
  metrics: RiskMetric[];
}

const RiskExposureIndicator = ({ metrics }: RiskExposureIndicatorProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return 'text-success bg-success/10 border-success/30';
      case 'warning':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'critical':
        return 'text-error bg-error/10 border-error/30';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'ArrowTrendingUpIcon';
      case 'down':
        return 'ArrowTrendingDownIcon';
      default:
        return 'MinusIcon';
    }
  };

  const getTrendColor = (trend: string, status: string) => {
    if (status === 'critical') {
      return trend === 'up' ? 'text-error' : 'text-success';
    }
    return trend === 'up' ? 'text-warning' : 'text-success';
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border elevation-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
            Risk Exposure Indicators
          </h3>
          <p className="font-body text-sm text-muted-foreground">
            Real-time threshold monitoring and safety margins
          </p>
        </div>
        <Icon name="ShieldExclamationIcon" size={32} className="text-accent" />
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const percentage = (metric.currentLevel / metric.threshold) * 100;
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-body font-medium text-sm text-foreground">
                    {metric.category}
                  </span>
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md border font-caption text-xs font-medium ${getStatusColor(
                      metric.status
                    )}`}
                  >
                    {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-data text-sm font-semibold text-foreground">
                      {metric.currentLevel.toFixed(1)}
                    </span>
                    <span className="font-caption text-xs text-muted-foreground">
                      {' '}/ {metric.threshold.toFixed(1)}
                    </span>
                  </div>
                  <Icon
                    name={getTrendIcon(metric.trend) as any}
                    size={16}
                    className={getTrendColor(metric.trend, metric.status)}
                  />
                </div>
              </div>

              <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-smooth ${
                    metric.status === 'safe' ?'bg-success'
                      : metric.status === 'warning' ?'bg-warning' :'bg-error'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
                {percentage >= 80 && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/30"
                    style={{ left: '80%' }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-caption text-xs text-muted-foreground">
                  {percentage.toFixed(1)}% of threshold
                </span>
                <span className="font-caption text-xs text-muted-foreground">
                  Safety margin: {(100 - percentage).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskExposureIndicator;