'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  category: string;
}

interface CriticalAlertsPanelProps {
  alerts: Alert[];
}

const CriticalAlertsPanel = ({ alerts }: CriticalAlertsPanelProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-error bg-error/10 border-error/30';
      case 'medium':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'low':
        return 'text-accent bg-accent/10 border-accent/30';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high':
        return 'ExclamationCircleIcon';
      case 'medium':
        return 'ExclamationTriangleIcon';
      case 'low':
        return 'InformationCircleIcon';
      default:
        return 'BellIcon';
    }
  };

  const toggleAlert = (id: string) => {
    if (!isHydrated) return;
    setExpandedAlert(expandedAlert === id ? null : id);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
          Critical Alerts
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Critical Alerts
        </h3>
        <span className="px-3 py-1 bg-error/10 text-error text-xs font-medium rounded-full">
          {alerts.length} Active
        </span>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Icon
              name="CheckCircleIcon"
              size={48}
              className="text-success mb-3"
            />
            <p className="font-body text-sm text-muted-foreground">
              No critical alerts at this time
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg transition-smooth ${getSeverityColor(
                alert.severity
              )}`}
            >
              <button
                onClick={() => toggleAlert(alert.id)}
                className="w-full flex items-start gap-3 p-4 text-left focus-ring"
              >
                <Icon
                  name={getSeverityIcon(alert.severity) as any}
                  size={20}
                  className="flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-body font-medium text-sm text-foreground">
                      {alert.title}
                    </h4>
                    <span className="flex-shrink-0 font-caption text-xs text-muted-foreground">
                      {alert.timestamp}
                    </span>
                  </div>
                  <p className="font-caption text-xs text-muted-foreground mb-1">
                    {alert.category}
                  </p>
                  {expandedAlert === alert.id && (
                    <p className="font-body text-sm text-foreground mt-2 animate-fade-in">
                      {alert.description}
                    </p>
                  )}
                </div>
                <Icon
                  name={
                    expandedAlert === alert.id
                      ? 'ChevronUpIcon' :'ChevronDownIcon'
                  }
                  size={16}
                  className="flex-shrink-0 mt-1 transition-smooth"
                />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CriticalAlertsPanel;