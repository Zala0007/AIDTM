import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { TransportDataPoint } from '@/lib/optimizerApi';


interface CostCarbonBalancePanelProps {
  data: TransportDataPoint[];
  emissionThreshold: number;
  onThresholdChange: (value: number) => void;
}

const CostCarbonBalancePanel = ({
  data,
  emissionThreshold,
  onThresholdChange,
}: CostCarbonBalancePanelProps) => {
  const chartData = data.map((item) => ({
    id: item.id,
    cost: item.cost / 1000,
    emissions: item.totalEmissions / 1000,
    mode: item.mode,
    carbonIntensity: item.carbonIntensity,
  }));

  const modeColors: Record<string, string> = {
    rail: 'var(--color-success)',
    road: 'var(--color-warning)',
    multimodal: 'var(--color-primary)',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 elevation-3">
          <p className="font-heading font-semibold text-sm text-foreground mb-2 capitalize">
            {data.mode}
          </p>
          <div className="space-y-1">
            <p className="font-body text-xs text-muted-foreground">
              Cost:{' '}
              <span className="font-data font-medium text-foreground">
                ₹{data.cost.toFixed(1)}K
              </span>
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Emissions:{' '}
              <span className="font-data font-medium text-foreground">
                {data.emissions.toFixed(1)} tons CO₂
              </span>
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Carbon Intensity:{' '}
              <span className="font-data font-medium text-foreground">
                {data.carbonIntensity.toFixed(3)}
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
          Cost-Carbon Balance
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Cost efficiency vs carbon footprint mapping
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="font-body text-sm text-muted-foreground whitespace-nowrap">
          Emission Threshold:
        </label>
        <input
          type="range"
          min="30000"
          max="100000"
          step="5000"
          value={emissionThreshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        />
        <span className="font-data text-sm text-foreground font-medium whitespace-nowrap">
          {(emissionThreshold / 1000).toFixed(0)} tons
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 74, 71, 0.15)" />
          <XAxis
            type="number"
            dataKey="cost"
            name="Cost"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            label={{
              value: 'Cost (K INR)',
              position: 'insideBottom',
              offset: -10,
              style: { fill: 'var(--color-foreground)', fontSize: 11, fontWeight: 500 },
            }}
          />
          <YAxis
            type="number"
            dataKey="emissions"
            name="Emissions"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            label={{
              value: 'Emissions (tons CO₂)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--color-foreground)', fontSize: 11, fontWeight: 500 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={emissionThreshold / 1000}
            stroke="var(--color-destructive)"
            strokeDasharray="5 5"
            strokeWidth={2}
          />
          <Scatter name="Routes" data={chartData}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={modeColors[entry.mode] || 'var(--color-primary)'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CostCarbonBalancePanel;
