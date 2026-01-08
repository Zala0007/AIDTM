'use client';

import { useState, useEffect } from 'react';
import PeriodSelector, {
  PeriodOption,
} from '@/components/common/PeriodSelector';
import NotificationIndicator from '@/components/common/NotificationIndicator';
import MetricCard from './MetricCard';
import NetworkStatusPanel from './NetworkStatusPanel';
import CriticalAlertsPanel from './CriticalAlertsPanel';
import QuickActionsPanel from './QuickActionsPanel';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
}

interface MetricData {
  title: string;
  value: string;
  unit: string;
  trend: number;
  trendLabel: string;
  icon: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
}

interface NetworkStatus {
  id: string;
  label: string;
  value: string;
  status: 'operational' | 'warning' | 'critical';
  icon: string;
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  category: string;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
}

const ExecutiveControlRoomInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('monthly');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'High Inventory Risk Detected',
      message: 'IU-3 inventory levels approaching critical threshold',
      type: 'warning',
      timestamp: '15 mins ago',
      isRead: false,
    },
    {
      id: '2',
      title: 'Transportation Delay',
      message: 'Rail shipment from IU-1 to GU-4 delayed by 3 hours',
      type: 'error',
      timestamp: '1 hour ago',
      isRead: false,
    },
    {
      id: '3',
      title: 'Cost Efficiency Improved',
      message: 'Monthly cost efficiency index increased by 2.3%',
      type: 'success',
      timestamp: '2 hours ago',
      isRead: true,
    },
  ];

  const metricsData: MetricData[] = [
    {
      title: 'Total Cost',
      value: '₹24.8',
      unit: 'M',
      trend: -3.2,
      trendLabel: 'vs last period',
      icon: 'CurrencyDollarIcon',
      color: 'primary',
    },
    {
      title: 'Cost Efficiency Index',
      value: '0.87',
      unit: '',
      trend: 2.1,
      trendLabel: 'vs last period',
      icon: 'ChartBarIcon',
      color: 'accent',
    },
    {
      title: 'Service Level',
      value: '96.4',
      unit: '%',
      trend: 1.8,
      trendLabel: 'vs last period',
      icon: 'CheckBadgeIcon',
      color: 'success',
    },
    {
      title: 'Inventory Risk Indicator',
      value: '0.23',
      unit: '',
      trend: -5.4,
      trendLabel: 'vs last period',
      icon: 'ExclamationTriangleIcon',
      color: 'warning',
    },
  ];

  const networkStatuses: NetworkStatus[] = [
    {
      id: '1',
      label: 'Active IUs',
      value: '8 of 8',
      status: 'operational',
      icon: 'BuildingOffice2Icon',
    },
    {
      id: '2',
      label: 'Active GUs',
      value: '12 of 14',
      status: 'warning',
      icon: 'BuildingStorefrontIcon',
    },
    {
      id: '3',
      label: 'Transport Routes',
      value: '47 Active',
      status: 'operational',
      icon: 'TruckIcon',
    },
    {
      id: '4',
      label: 'Rail Utilization',
      value: '78%',
      status: 'operational',
      icon: 'MapIcon',
    },
  ];

  const alerts: Alert[] = [
    {
      id: '1',
      title: 'Inventory Threshold Breach',
      description:
        'IU-3 clinker inventory has fallen below safety stock baseline. Immediate production adjustment recommended to prevent service disruption.',
      severity: 'high',
      timestamp: '10 mins ago',
      category: 'Inventory Management',
    },
    {
      id: '2',
      title: 'Transportation Cost Spike',
      description:
        'Road transportation costs from IU-2 to GU-7 increased by 18% due to fuel price volatility. Consider alternative routing or mode switching.',
      severity: 'medium',
      timestamp: '45 mins ago',
      category: 'Cost Optimization',
    },
    {
      id: '3',
      title: 'Demand Forecast Update',
      description:
        'Regional demand forecast for Q1 2026 revised upward by 12%. Review production capacity allocation and transportation planning.',
      severity: 'low',
      timestamp: '2 hours ago',
      category: 'Planning & Forecasting',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: '1',
      label: 'Network Optimization',
      description: 'View detailed flow mapping and route analysis',
      icon: 'MapIcon',
      href: '/network-optimization-view',
      color: 'primary',
    },
    {
      id: '2',
      label: 'Scenario Analysis',
      description: 'Compare scenarios and analyze risk exposure',
      icon: 'BeakerIcon',
      href: '/scenario-risk-analysis',
      color: 'accent',
    },
    {
      id: '3',
      label: 'Inventory Intelligence',
      description: 'Monitor safety stock and time-series trends',
      icon: 'CubeIcon',
      href: '/inventory-safety-stock',
      color: 'success',
    },
    {
      id: '4',
      label: 'Sustainability Dashboard',
      description: 'Track carbon footprint and emission metrics',
      icon: 'SparklesIcon',
      href: '/sustainability-trade-offs',
      color: 'warning',
    },
  ];

  const handlePeriodChange = (period: PeriodOption) => {
    if (!isHydrated) return;
    setIsRefreshing(true);
    setSelectedPeriod(period);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!isHydrated) return;
    // Handle notification click - could trigger navigation or modal
  };

  const handleMarkAllRead = () => {
    if (!isHydrated) return;
    // Mark all notifications as read
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background pt-20 px-lg pb-xl">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-muted rounded-lg w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-lg pb-xl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-4xl font-semibold text-foreground mb-2">
              Executive Control Room
            </h1>
            <p className="font-body text-base text-muted-foreground">
              Strategic oversight and performance monitoring for clinker
              optimization
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
            />
            <NotificationIndicator
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAllRead={handleMarkAllRead}
            />
          </div>
        </div>

        {isRefreshing && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-3">
            <div className="animate-spin">
              <svg
                className="w-5 h-5 text-accent"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <span className="font-body text-sm text-foreground">
              Refreshing data for {selectedPeriod} period...
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricsData.map((metric, index) => (
            <MetricCard
              key={metric.title}
              {...metric}
              delay={index * 100}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NetworkStatusPanel statuses={networkStatuses} />
          <CriticalAlertsPanel alerts={alerts} />
        </div>

        <QuickActionsPanel actions={quickActions} />
      </div>
    </div>
  );
};

export default ExecutiveControlRoomInteractive;