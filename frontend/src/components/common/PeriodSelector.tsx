'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export type PeriodOption = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface PeriodSelectorProps {
  selectedPeriod: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  availablePeriods?: PeriodOption[];
  className?: string;
}

const PeriodSelector = ({
  selectedPeriod,
  onPeriodChange,
  availablePeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  className = '',
}: PeriodSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const periodLabels: Record<PeriodOption, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  const periodIcons: Record<PeriodOption, string> = {
    daily: 'CalendarDaysIcon',
    weekly: 'CalendarIcon',
    monthly: 'CalendarIcon',
    quarterly: 'ChartBarIcon',
    yearly: 'ChartBarSquareIcon',
  };

  const handlePeriodSelect = (period: PeriodOption) => {
    onPeriodChange(period);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-6 py-2.5 bg-card border border-border rounded-md font-body font-medium text-sm text-foreground hover:bg-muted transition-smooth focus-ring interactive-lift"
        aria-label="Select time period"
        aria-expanded={isOpen}
      >
        <Icon name={periodIcons[selectedPeriod] as any} size={18} />
        <span>{periodLabels[selectedPeriod]}</span>
        <Icon
          name="ChevronDownIcon"
          size={16}
          className={`transition-smooth ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-dropdown"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-dropdown animate-fade-in">
            <div className="py-2">
              {availablePeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 font-body text-sm transition-smooth focus-ring ${
                    selectedPeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name={periodIcons[period] as any} size={18} />
                  <span>{periodLabels[period]}</span>
                  {selectedPeriod === period && (
                    <Icon
                      name="CheckIcon"
                      size={16}
                      className="ml-auto"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodSelector;