'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend: number;
  trendLabel: string;
  icon: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
  delay?: number;
}

const MetricCard = ({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  color,
  delay = 0,
}: MetricCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (isVisible) {
      const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
      const duration = 1500;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setAnimatedValue(numericValue);
          clearInterval(interval);
        } else {
          setAnimatedValue(current);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }
  }, [isVisible, value]);

  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  const formatValue = (val: number): string => {
    if (value.includes('₹') || value.includes('$')) {
      return `₹${val.toFixed(2)}M`;
    } else if (value.includes('%')) {
      return `${val.toFixed(1)}%`;
    } else {
      return val.toFixed(2);
    }
  };

  return (
    <div
      className={`bg-card rounded-lg p-6 border border-border transition-all duration-500 hover:shadow-lg interactive-lift ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="font-caption text-sm text-muted-foreground mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h2 className="font-heading text-3xl font-semibold text-foreground">
              {isVisible ? formatValue(animatedValue) : '0'}
            </h2>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon name={icon as any} size={24} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
            trend >= 0
              ? 'bg-success/10 text-success' :'bg-error/10 text-error'
          }`}
        >
          <Icon
            name={trend >= 0 ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'}
            size={14}
          />
          <span>{Math.abs(trend)}%</span>
        </div>
        <span className="font-caption text-xs text-muted-foreground">
          {trendLabel}
        </span>
      </div>
    </div>
  );
};

export default MetricCard;