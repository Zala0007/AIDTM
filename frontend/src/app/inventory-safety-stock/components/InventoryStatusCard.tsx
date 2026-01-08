import Icon from '@/components/ui/AppIcon';

interface InventoryStatusCardProps {
  unitName: string;
  currentStock: number;
  safetyStock: number;
  daysOfSupply: number;
  riskLevel: 'healthy' | 'warning' | 'critical';
  unit: string;
}

const InventoryStatusCard = ({
  unitName,
  currentStock,
  safetyStock,
  daysOfSupply,
  riskLevel,
  unit,
}: InventoryStatusCardProps) => {
  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'critical':
        return {
          bgColor: 'bg-error/10',
          textColor: 'text-error',
          icon: 'ExclamationCircleIcon' as const,
          label: 'Critical Risk',
          borderColor: 'border-error/20',
        };
      case 'warning':
        return {
          bgColor: 'bg-warning/10',
          textColor: 'text-warning',
          icon: 'ExclamationTriangleIcon' as const,
          label: 'At Risk',
          borderColor: 'border-warning/20',
        };
      default:
        return {
          bgColor: 'bg-success/10',
          textColor: 'text-success',
          icon: 'CheckCircleIcon' as const,
          label: 'Healthy',
          borderColor: 'border-success/20',
        };
    }
  };

  const config = getRiskConfig();
  const stockPercentage = (currentStock / safetyStock) * 100;

  return (
    <div className="group bg-card rounded-lg border border-border p-6 elevation-1 transition-smooth hover:elevation-3 interactive-lift hover:border-accent/30 overflow-hidden relative">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-heading font-semibold text-lg text-foreground mb-1 transition-smooth group-hover:text-accent">
              {unitName}
            </h4>
            <p className="font-caption text-xs text-muted-foreground">
              Manufacturing Unit
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 ${config.bgColor} ${config.textColor} rounded-md border ${config.borderColor} transition-smooth group-hover:scale-105`}>
            <Icon name={config.icon} size={16} />
            <span className="font-caption text-xs font-semibold">
              {config.label}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-body text-sm text-muted-foreground">
                Current Stock
              </span>
              <span className="font-heading font-semibold text-2xl text-foreground transition-smooth group-hover:text-accent">
                {currentStock.toLocaleString()}
                <span className="font-body text-sm text-muted-foreground ml-1">
                  {unit}
                </span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden relative">
              <div
                className={`h-full animate-progress transition-all duration-700 relative overflow-hidden ${
                  riskLevel === 'critical' ? 'bg-error'
                    : riskLevel === 'warning' ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            <p className="font-caption text-xs text-muted-foreground mt-1.5">
              {stockPercentage.toFixed(1)}% of safety stock level
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="transition-smooth group-hover:translate-x-1">
              <p className="font-caption text-xs text-muted-foreground mb-1">
                Safety Stock
              </p>
              <p className="font-body font-medium text-base text-foreground">
                {safetyStock.toLocaleString()} {unit}
              </p>
            </div>
            <div className="transition-smooth group-hover:translate-x-1">
              <p className="font-caption text-xs text-muted-foreground mb-1">
                Days of Supply
              </p>
              <p className="font-body font-medium text-base text-foreground">
                {daysOfSupply} days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryStatusCard;