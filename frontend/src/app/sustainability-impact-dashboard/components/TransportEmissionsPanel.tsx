'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TransportDataPoint } from '@/lib/optimizerApi';

interface TransportEmissionsPanelProps {
  data: TransportDataPoint[];
}

const TransportEmissionsPanel = ({ data }: TransportEmissionsPanelProps) => {
  const emissionsByMode = data.reduce((acc, item) => {
    const existing = acc.find((entry) => entry.mode === item.mode);
    if (existing) {
      existing.totalEmissions += item.totalEmissions;
      existing.avgCo2PerTonKm = (existing.avgCo2PerTonKm + item.co2PerTonKm) / 2;
    } else {
      acc.push({
        mode: item.mode,
        totalEmissions: item.totalEmissions,
        avgCo2PerTonKm: item.co2PerTonKm,
      });
    }
    return acc;
  }, [] as { mode: string; totalEmissions: number; avgCo2PerTonKm: number }[]);

  const chartData = emissionsByMode.map((item) => ({
    mode: item.mode.charAt(0).toUpperCase() + item.mode.slice(1),
    emissions: Math.round(item.totalEmissions / 1000),
    co2PerTonKm: item.avgCo2PerTonKm,
  }));

  const modeColors: Record<string, string> = {
    Rail: 'var(--color-success)',
    Road: 'var(--color-warning)',
    Multimodal: 'var(--color-primary)',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 elevation-3">
          <p className="font-heading font-semibold text-sm text-foreground mb-2">
            {data.mode}
          </p>
          <div className="space-y-1">
            <p className="font-body text-xs text-muted-foreground">
              Total Emissions:{' '}
              <span className="font-data font-medium text-foreground">
                {data.emissions.toLocaleString()} tons CO₂
              </span>
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Avg CO₂/ton-km:{' '}
              <span className="font-data font-medium text-foreground">
                {data.co2PerTonKm.toFixed(3)} kg
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1">
      <div className="mb-4">
        <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
          Transport Mode Emissions
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          CO₂ emissions by transportation method
        </p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 74, 71, 0.15)" />
          <XAxis
            dataKey="mode"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            label={{
              value: 'Emissions (tons CO₂)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--color-foreground)', fontSize: 12, fontWeight: 500 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="emissions" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={modeColors[entry.mode] || 'var(--color-primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TransportEmissionsPanel;
