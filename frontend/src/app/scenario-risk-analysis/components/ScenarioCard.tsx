import Icon from '@/components/ui/AppIcon';

interface ScenarioMetrics {
  totalDemand: number;
  demandChange: number;
  serviceLevel: number;
  serviceLevelChange: number;
  riskExposure: 'low' | 'medium' | 'high' | 'critical';
  inventoryTurnover: number;
  transportEfficiency: number;
}

interface ScenarioCardProps {
  title: string;
  description: string;
  metrics: ScenarioMetrics;
  isActive: boolean;
  onSelect: () => void;
}

const ScenarioCard = ({ title, description, metrics, isActive, onSelect }: ScenarioCardProps) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-success bg-success/10';
      case 'medium':
        return 'text-warning bg-warning/10';
      case 'high':
        return 'text-error bg-error/10';
      case 'critical':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'CheckCircleIcon';
      case 'medium':
        return 'ExclamationTriangleIcon';
      case 'high':
        return 'ExclamationCircleIcon';
      case 'critical':
        return 'XCircleIcon';
      default:
        return 'InformationCircleIcon';
    }
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-6 rounded-lg border-2 transition-smooth interactive-lift focus-ring ${
        isActive
          ? 'border-accent bg-accent/5 elevation-2' :'border-border bg-card hover:border-accent/50 elevation-1'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-xl text-foreground mb-1">
            {title}
          </h3>
          <p className="font-body text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {isActive && (
          <Icon
            name="CheckBadgeIcon"
            size={24}
            className="text-accent flex-shrink-0 ml-3"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="font-caption text-xs text-muted-foreground mb-1">
            Total Demand (tons)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-data text-lg font-semibold text-foreground">
              {metrics.totalDemand.toLocaleString()}
            </span>
            <span
              className={`font-caption text-xs font-medium ${
                metrics.demandChange >= 0 ? 'text-error' : 'text-success'
              }`}
            >
              {metrics.demandChange >= 0 ? '+' : ''}
              {metrics.demandChange.toFixed(1)}%
            </span>
          </div>
        </div>

        <div>
          <p className="font-caption text-xs text-muted-foreground mb-1">
            Service Level
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-data text-lg font-semibold text-foreground">
              {metrics.serviceLevel.toFixed(1)}%
            </span>
            <span
              className={`font-caption text-xs font-medium ${
                metrics.serviceLevelChange >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {metrics.serviceLevelChange >= 0 ? '+' : ''}
              {metrics.serviceLevelChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="font-caption text-xs text-muted-foreground">
            Risk Exposure:
          </span>
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-caption text-xs font-medium ${getRiskColor(
              metrics.riskExposure
            )}`}
          >
            <Icon name={getRiskIcon(metrics.riskExposure) as any} size={14} />
            {metrics.riskExposure.charAt(0).toUpperCase() + metrics.riskExposure.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-caption text-xs text-muted-foreground">
              Inventory Turnover
            </p>
            <p className="font-data text-sm font-medium text-foreground">
              {metrics.inventoryTurnover.toFixed(1)}x
            </p>
          </div>
          <div className="text-right">
            <p className="font-caption text-xs text-muted-foreground">
              Transport Efficiency
            </p>
            <p className="font-data text-sm font-medium text-foreground">
              {metrics.transportEfficiency.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </button>
  );
};

export default ScenarioCard;