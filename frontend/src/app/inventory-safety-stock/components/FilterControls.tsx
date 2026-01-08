'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FilterControlsProps {
  selectedUnits: string[];
  availableUnits: string[];
  selectedMetric: 'absolute' | 'percentage';
  onUnitChange: (units: string[]) => void;
  onMetricChange: (metric: 'absolute' | 'percentage') => void;
}

const FilterControls = ({
  selectedUnits,
  availableUnits,
  selectedMetric,
  onUnitChange,
  onMetricChange,
}: FilterControlsProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="h-10 w-48 bg-muted rounded-md animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  const handleUnitToggle = (unit: string) => {
    if (selectedUnits.includes(unit)) {
      onUnitChange(selectedUnits.filter((u) => u !== unit));
    } else {
      onUnitChange([...selectedUnits, unit]);
    }
  };

  const handleSelectAll = () => {
    onUnitChange(availableUnits);
  };

  const handleClearAll = () => {
    onUnitChange([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="relative">
        <button
          onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-md font-body font-medium text-sm text-foreground hover:bg-muted hover:border-accent/30 transition-smooth focus-ring interactive-lift"
        >
          <Icon name="FunnelIcon" size={18} className="transition-smooth" />
          <span>
            Units ({selectedUnits.length}/{availableUnits.length})
          </span>
          <Icon
            name="ChevronDownIcon"
            size={16}
            className={`transition-smooth ${isUnitDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isUnitDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-dropdown"
              onClick={() => setIsUnitDropdownOpen(false)}
            />
            <div className="absolute left-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-dropdown animate-fade-in elevation-4">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-body font-medium text-sm text-foreground">
                  Select Units
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="font-caption text-xs text-accent hover:text-accent/80 transition-smooth font-semibold"
                  >
                    All
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    onClick={handleClearAll}
                    className="font-caption text-xs text-accent hover:text-accent/80 transition-smooth font-semibold"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-2">
                {availableUnits.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => handleUnitToggle(unit)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 font-body text-sm text-foreground hover:bg-muted transition-smooth focus-ring"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-smooth ${
                        selectedUnits.includes(unit)
                          ? 'bg-accent border-accent scale-105' : 'border-border'
                      }`}
                    >
                      {selectedUnits.includes(unit) && (
                        <Icon name="CheckIcon" size={14} className="text-white" />
                      )}
                    </div>
                    <span>{unit}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-md p-1 elevation-1">
        <button
          onClick={() => onMetricChange('absolute')}
          className={`px-4 py-2 rounded font-body font-medium text-sm transition-smooth focus-ring ${
            selectedMetric === 'absolute' ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground hover:bg-muted'
          }`}
        >
          Absolute Values
        </button>
        <button
          onClick={() => onMetricChange('percentage')}
          className={`px-4 py-2 rounded font-body font-medium text-sm transition-smooth focus-ring ${
            selectedMetric === 'percentage' ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground hover:bg-muted'
          }`}
        >
          % of Safety Stock
        </button>
      </div>
    </div>
  );
};

export default FilterControls;