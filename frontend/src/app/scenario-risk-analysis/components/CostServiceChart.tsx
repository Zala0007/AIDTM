import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart, ZAxis } from 'recharts';

interface DataPoint {
  scenario: string;
  demand: number;
  serviceLevel: number;
  riskScore: number;
}

interface CostServiceChartProps {
  data: DataPoint[];
  activeScenario: string;
}

const CostServiceChart = ({ data, activeScenario }: CostServiceChartProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 elevation-3">
          <p className="font-heading font-semibold text-sm text-foreground mb-2">
            {data.scenario}
          </p>
          <div className="space-y-1">
            <p className="font-body text-xs text-muted-foreground">
              Demand: <span className="font-data font-medium text-foreground">{data.demand.toLocaleString()} tons</span>
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Service Level: <span className="font-data font-medium text-foreground">{data.serviceLevel.toFixed(1)}%</span>
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Risk Score: <span className="font-data font-medium text-foreground">{data.riskScore.toFixed(1)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96 bg-card rounded-lg p-6 border border-border elevation-1">
      <div className="mb-4">
        <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
          Cost vs Service Level Analysis
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Comparative scenario performance mapping
        </p>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 74, 71, 0.15)" />
          <XAxis
            type="number"
            dataKey="demand"
            name="Total Demand"
            domain={['dataMin - 50000', 'dataMax + 50000']}
            tickFormatter={(value) => `${Math.round(value / 1000)}k tons`}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            label={{
              value: 'Total Demand (tons)',
              position: 'insideBottom',
              offset: -10,
              style: { fill: 'var(--color-foreground)', fontSize: 13, fontWeight: 500 }
            }}
          />
          <YAxis
            type="number"
            dataKey="serviceLevel"
            name="Service Level"
            domain={[90, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            label={{
              value: 'Service Level (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--color-foreground)', fontSize: 13, fontWeight: 500 }
            }}
          />
          <ZAxis type="number" dataKey="riskScore" range={[100, 400]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)'
            }}
          />
          <Scatter
            name="Scenarios"
            data={data}
            fill="var(--color-accent)"
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const isActive = payload.scenario === activeScenario;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 8 : 6}
                  fill={isActive ? 'var(--color-accent)' : 'var(--color-primary)'}
                  stroke={isActive ? 'var(--color-accent)' : 'var(--color-border)'}
                  strokeWidth={isActive ? 3 : 2}
                  opacity={isActive ? 1 : 0.7}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CostServiceChart;