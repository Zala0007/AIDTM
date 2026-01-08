'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
}

interface QuickActionsPanelProps {
  actions: QuickAction[];
}

const QuickActionsPanel = ({ actions }: QuickActionsPanelProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getColorClasses = (color: QuickAction['color']) => {
    switch (color) {
      case 'primary':
        return 'bg-primary/10 text-primary hover:bg-primary/20';
      case 'accent':
        return 'bg-accent/10 text-accent hover:bg-accent/20';
      case 'success':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning hover:bg-warning/20';
      default:
        return 'bg-muted text-foreground hover:bg-muted/80';
    }
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`flex items-start gap-4 p-4 rounded-lg border border-border transition-smooth interactive-lift focus-ring ${getColorClasses(
              action.color
            )}`}
          >
            <div className="p-2 rounded-lg bg-background/50">
              <Icon name={action.icon as any} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-body font-medium text-sm text-foreground mb-1">
                {action.label}
              </h4>
              <p className="font-caption text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>
            <Icon
              name="ChevronRightIcon"
              size={16}
              className="flex-shrink-0 mt-1 opacity-50"
            />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsPanel;