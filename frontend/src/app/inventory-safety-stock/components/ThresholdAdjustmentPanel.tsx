'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ThresholdAdjustmentPanelProps {
  unitName: string;
  currentSafetyStock: number;
  currentCriticalLevel: number;
  unit: string;
  onAdjust: (safetyStock: number, criticalLevel: number) => void;
}

const ThresholdAdjustmentPanel = ({
  unitName,
  currentSafetyStock,
  currentCriticalLevel,
  unit,
  onAdjust,
}: ThresholdAdjustmentPanelProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [safetyStock, setSafetyStock] = useState(currentSafetyStock);
  const [criticalLevel, setCriticalLevel] = useState(currentCriticalLevel);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setSafetyStock(currentSafetyStock);
    setCriticalLevel(currentCriticalLevel);
  }, [currentSafetyStock, currentCriticalLevel]);

  if (!isHydrated) {
    return null;
  }

  const handleApply = () => {
    onAdjust(safetyStock, criticalLevel);
    setIsOpen(false);
  };

  const handleReset = () => {
    setSafetyStock(currentSafetyStock);
    setCriticalLevel(currentCriticalLevel);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-md font-body font-medium text-sm hover:bg-accent/90 transition-smooth focus-ring interactive-scale elevation-1 hover:elevation-2"
      >
        <Icon name="AdjustmentsHorizontalIcon" size={18} className="transition-smooth group-hover:rotate-90" />
        <span>Adjust Thresholds</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-foreground/50 z-modal backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-modal flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-lg animate-entrance elevation-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="font-heading font-semibold text-xl text-foreground">
                  Adjust Thresholds - {unitName}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth focus-ring interactive-scale"
                >
                  <Icon name="XMarkIcon" size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="group">
                  <label className="block font-body font-medium text-sm text-foreground mb-2">
                    Safety Stock Level
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(Number(e.target.value))}
                      className="flex-1 px-4 py-2.5 bg-background border border-border rounded-md font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition-smooth"
                      min="0"
                      step="100"
                    />
                    <span className="font-body text-sm text-muted-foreground font-medium">
                      {unit}
                    </span>
                  </div>
                  <p className="font-caption text-xs text-muted-foreground mt-2">
                    Recommended minimum inventory level for normal operations
                  </p>
                </div>

                <div className="group">
                  <label className="block font-body font-medium text-sm text-foreground mb-2">
                    Critical Threshold Level
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={criticalLevel}
                      onChange={(e) => setCriticalLevel(Number(e.target.value))}
                      className="flex-1 px-4 py-2.5 bg-background border border-border rounded-md font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition-smooth"
                      min="0"
                      step="100"
                    />
                    <span className="font-body text-sm text-muted-foreground font-medium">
                      {unit}
                    </span>
                  </div>
                  <p className="font-caption text-xs text-muted-foreground mt-2">
                    Alert level requiring immediate action
                  </p>
                </div>

                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 transition-smooth hover:bg-accent/10">
                  <div className="flex items-start gap-3">
                    <Icon
                      name="InformationCircleIcon"
                      size={20}
                      className="text-accent flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-body text-sm text-foreground mb-1 font-medium">
                        Impact Analysis
                      </p>
                      <p className="font-caption text-xs text-muted-foreground">
                        Adjusting thresholds will recalculate risk indicators and update
                        inventory planning recommendations across all periods.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-muted text-foreground rounded-md font-body font-medium text-sm hover:bg-muted/80 transition-smooth focus-ring interactive-scale"
                >
                  Reset
                </button>
                <button
                  onClick={handleApply}
                  className="px-5 py-2.5 bg-accent text-accent-foreground rounded-md font-body font-medium text-sm hover:bg-accent/90 transition-smooth focus-ring interactive-scale elevation-1 hover:elevation-2"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ThresholdAdjustmentPanel;