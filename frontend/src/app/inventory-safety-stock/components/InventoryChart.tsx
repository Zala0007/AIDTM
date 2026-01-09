'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,  } from 'recharts';

interface InventoryDataPoint {
  period: string;
  inventory: number;
  safetyStock: number;
  criticalThreshold: number;
}

interface InventoryChartProps {
  unitName: string;
  data: InventoryDataPoint[];
  currentLevel: number;
  safetyStockLevel: number;
  criticalLevel: number;
  unit: string;
}

const InventoryChart = ({
  unitName,
  data,
  currentLevel,
  safetyStockLevel,
  criticalLevel,
  unit,
}: InventoryChartProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 h-96 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-full bg-muted rounded" />
      </div>
    );
  }

  const isAtRisk = currentLevel < safetyStockLevel;
  const isCritical = currentLevel < criticalLevel;

  return (
    <div className="group bg-card rounded-lg border border-border p-6 elevation-2 transition-smooth hover:elevation-4 hover:border-accent/30 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading font-semibold text-xl text-foreground mb-1 transition-smooth group-hover:text-accent">
              {unitName}
            </h3>
            <p className="font-caption text-sm text-muted-foreground">
              Inventory Level: <span className="font-medium text-foreground">{currentLevel.toLocaleString()} {unit}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCritical && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 text-error rounded-md font-caption text-xs font-semibold border border-error/20 transition-smooth hover:scale-105">
                <span className="w-2 h-2 bg-error rounded-full pulse-glow" />
                Critical
              </span>
            )}
            {isAtRisk && !isCritical && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 text-warning rounded-md font-caption text-xs font-semibold border border-warning/20 transition-smooth hover:scale-105">
                <span className="w-2 h-2 bg-warning rounded-full pulse-glow" />
                At Risk
              </span>
            )}
            {!isAtRisk && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-md font-caption text-xs font-semibold border border-success/20 transition-smooth hover:scale-105">
                <span className="w-2 h-2 bg-success rounded-full" />
                Healthy
              </span>
            )}
          </div>
        </div>

        <div className="w-full h-80" aria-label={`${unitName} Inventory Time Series Chart`}>
          <ResponsiveContainer width="100%" height={320} minHeight={320}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`inventoryGradient-${unitName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="period"
                stroke="var(--color-muted-foreground)"
                style={{ fontSize: '12px', fontFamily: 'var(--font-caption)' }}
                tick={{ fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                style={{ fontSize: '12px', fontFamily: 'var(--font-caption)' }}
                tick={{ fill: 'var(--color-muted-foreground)' }}
                label={{
                  value: unit,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: '12px', fill: 'var(--color-muted-foreground)' },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-body)',
                  boxShadow: 'var(--shadow-lg)',
                }}
                formatter={(value: number | undefined) => value !== undefined ? [`${value.toLocaleString()} ${unit}`, ''] : ['N/A', '']}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-caption)',
                }}
              />
              <ReferenceLine
                y={safetyStockLevel}
                stroke="var(--color-warning)"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: 'Safety Stock',
                  position: 'right',
                  style: { fontSize: '11px', fill: 'var(--color-warning)', fontWeight: 600 },
                }}
              />
              <ReferenceLine
                y={criticalLevel}
                stroke="var(--color-error)"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: 'Critical Level',
                  position: 'right',
                  style: { fontSize: '11px', fill: 'var(--color-error)', fontWeight: 600 },
                }}
              />
              <Area
                type="monotone"
                dataKey="inventory"
                stroke="var(--color-accent)"
                strokeWidth={3}
                fill={`url(#inventoryGradient-${unitName})`}
                name="Inventory Level"
                animationDuration={1200}
                animationBegin={200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InventoryChart;