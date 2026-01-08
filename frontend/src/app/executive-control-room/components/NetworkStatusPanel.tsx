'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface NetworkStatus {
  id: string;
  label: string;
  value: string;
  status: 'operational' | 'warning' | 'critical';
  icon: string;
}

interface NetworkStatusPanelProps {
  statuses: NetworkStatus[];
}

const NetworkStatusPanel = ({ statuses }: NetworkStatusPanelProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getStatusColor = (status: NetworkStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-success bg-success/10';
      case 'warning':
        return 'text-warning bg-warning/10';
      case 'critical':
        return 'text-error bg-error/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: NetworkStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'CheckCircleIcon';
      case 'warning':
        return 'ExclamationTriangleIcon';
      case 'critical':
        return 'XCircleIcon';
      default:
        return 'InformationCircleIcon';
    }
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
          Network Status Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
        Network Status Overview
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map((status) => (
          <div
            key={status.id}
            className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-smooth"
          >
            <div className={`p-2 rounded-lg ${getStatusColor(status.status)}`}>
              <Icon name={status.icon as any} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-caption text-xs text-muted-foreground mb-0.5">
                {status.label}
              </p>
              <p className="font-body text-sm font-medium text-foreground truncate">
                {status.value}
              </p>
            </div>
            <Icon
              name={getStatusIcon(status.status) as any}
              size={18}
              className={getStatusColor(status.status).split(' ')[0]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkStatusPanel;