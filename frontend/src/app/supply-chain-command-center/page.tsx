'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useInitialData } from '@/lib/useInitialData';
import type { Plant } from '@/lib/optimizerApi';

interface RouteRow {
  id: string;
  source: string;
  destination: string;
  mode: string;
  cost: number;
  capacity: number;
  minBatch: number;
  isHighCost: boolean;
}

interface SummaryStats {
  totalNetworkCost: number;
  demandFulfilment: number;
  totalDemand: number;
  totalSupply: number;
}

const currency = (val: number) => `₹${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const Sidebar = ({ collapsed }: { collapsed: boolean }) => (
  <aside
    className={`h-full bg-card border-r border-border transition-all duration-200 ${collapsed ? 'w-14' : 'w-60'} hidden md:flex flex-col`}
  >
    <div className="flex items-center gap-2 px-4 py-4">
      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-heading text-lg">
        SC
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-heading font-semibold text-sm text-foreground">Supply Chain</span>
          <span className="text-xs text-muted-foreground">Command Center</span>
        </div>
      )}
    </div>
    <nav className="flex-1 px-2 space-y-1">
      {[
        { label: 'Overview', icon: 'ChartBarIcon' },
        { label: 'Nodes', icon: 'BuildingOffice2Icon' },
        { label: 'Logistics', icon: 'TruckIcon' },
        { label: 'Demand', icon: 'PresentationChartLineIcon' },
        { label: 'Alerts', icon: 'ShieldExclamationIcon' },
      ].map(({ label, icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <Icon name={icon} size={18} />
          {!collapsed && <span>{label}</span>}
        </div>
      ))}
    </nav>
    <div className="px-3 pb-4">
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
        {!collapsed && (
          <>
            <p className="font-semibold text-foreground text-sm mb-1">Data sources</p>
            <p>ClinkerDemand, ClinkerCapacity, IUGUType, IUGUOpeningStock, IUGUClosingStock, LogisticsIUGU.</p>
          </>
        )}
      </div>
    </div>
  </aside>
);

const SummaryTopBar = ({ stats }: { stats: SummaryStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/30 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Total Network Cost</p>
        <p className="text-2xl font-heading text-foreground mt-1">{currency(Math.round(stats.totalNetworkCost))}</p>
        <p className="text-xs text-muted-foreground mt-1">Routes × cost-per-trip (LogisticsIUGU)</p>
      </div>
      <Icon name="TruckIcon" size={32} className="text-primary" />
    </div>
    <div className="rounded-xl bg-gradient-to-br from-success/20 via-success/10 to-background border border-success/30 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Total Demand Fulfilment</p>
        <p className="text-2xl font-heading text-foreground mt-1">{stats.demandFulfilment.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground mt-1">Supply vs demand across all periods</p>
      </div>
      <Icon name="CursorArrowRaysIcon" size={32} className="text-success" />
    </div>
  </div>
);

const NodeCard = ({ plant }: { plant: Plant }) => {
  const utilization = plant.max_capacity ? Math.min(100, (plant.initial_inventory / plant.max_capacity) * 100) : 0;
  const isIU = plant.type === 'IU';
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{isIU ? 'Integrated Unit' : 'Grinding Unit'}</p>
          <p className="text-lg font-heading text-foreground">{plant.name || plant.id}</p>
          <p className="text-xs text-muted-foreground">ID: {plant.id}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {isIU ? <Icon name="BuildingOffice2Icon" size={20} /> : <Icon name="BuildingStorefrontIcon" size={20} />}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Inventory</span>
          <span>{Math.round(plant.initial_inventory).toLocaleString()} / {Math.round(plant.max_capacity).toLocaleString()} MT</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`${utilization > 90 ? 'bg-error' : utilization > 75 ? 'bg-warning' : 'bg-success'} h-full transition-all`}
            style={{ width: `${utilization}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <Icon name="ShieldCheckIcon" size={14} className="text-warning" />
            <span>Safety: {Math.round(plant.safety_stock).toLocaleString()} MT</span>
          </div>
          {isIU && plant.max_production_per_period && (
            <div className="flex items-center gap-1">
              <Icon name="FireIcon" size={14} className="text-accent" />
              <span>Cap/P: {Math.round(plant.max_production_per_period).toLocaleString()} MT</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LogisticsTable = ({ rows }: { rows: RouteRow[] }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.source.toLowerCase().includes(search.toLowerCase()) ||
          r.destination.toLowerCase().includes(search.toLowerCase()) ||
          r.mode.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3">
        <div>
          <p className="font-heading text-base text-foreground">Logistics Flow</p>
          <p className="text-xs text-muted-foreground">Searchable & paginated (LogisticsIUGU.csv)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search source, destination, mode"
            className="w-56 bg-muted border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Icon name="ArrowPathRoundedSquareIcon" size={18} className="text-muted-foreground" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Source</th>
              <th className="px-4 py-2 text-left">Destination</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-left">Cost/Trip</th>
              <th className="px-4 py-2 text-left">Cap/Trip (MT)</th>
              <th className="px-4 py-2 text-left">Min Batch</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-border ${row.isHighCost ? 'bg-error/10' : ''}`}
              >
                <td className="px-4 py-2 text-foreground font-medium">{row.source}</td>
                <td className="px-4 py-2 text-foreground">{row.destination}</td>
                <td className="px-4 py-2 capitalize">{row.mode}</td>
                <td className="px-4 py-2 font-data">{currency(row.cost)}</td>
                <td className="px-4 py-2 font-data">{row.capacity.toLocaleString()}</td>
                <td className="px-4 py-2 font-data">{row.minBatch.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
        <span>
          Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 rounded-md border border-border bg-muted disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 rounded-md border border-border bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const DemandCapacityChart = ({ data }: { data: { period: number; demand: number; capacity: number }[] }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="font-heading text-base text-foreground">Temporal Analysis</p>
        <p className="text-xs text-muted-foreground">Demand vs Capacity (ClinkerDemand.csv + ClinkerCapacity.csv)</p>
      </div>
      <Icon name="PresentationChartLineIcon" size={18} className="text-muted-foreground" />
    </div>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="period" stroke="var(--color-muted-foreground)" />
          <YAxis yAxisId="left" stroke="var(--color-muted-foreground)" />
          <YAxis yAxisId="right" orientation="right" stroke="var(--color-muted-foreground)" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="demand" stroke="var(--color-primary)" strokeWidth={2} dot={false} name="Demand" />
          <Line yAxisId="right" type="monotone" dataKey="capacity" stroke="var(--color-success)" strokeWidth={2} dot={false} name="Capacity" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const StockAlertPanel = ({ alerts }: { alerts: { id: string; plant: string; gap: number; severity: 'critical' | 'warning' }[] }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="font-heading text-base text-foreground">Stock Alerts</p>
        <p className="text-xs text-muted-foreground">Threshold watch from IUGUClosingStock.csv</p>
      </div>
      <Icon name="ShieldExclamationIcon" size={18} className="text-warning" />
    </div>
    {alerts.length === 0 ? (
      <p className="text-sm text-muted-foreground">All plants are above minimum close stock.</p>
    ) : (
      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className={`rounded-lg border border-border px-3 py-2 flex items-center justify-between ${a.severity === 'critical' ? 'bg-error/10' : 'bg-warning/10'}`}>
            <div>
              <p className="font-heading text-sm text-foreground">{a.plant}</p>
              <p className="text-xs text-muted-foreground">Inventory is within {Math.round(a.gap)} MT of minimum threshold.</p>
            </div>
            <div className={`text-xs font-semibold px-3 py-1 rounded-full ${a.severity === 'critical' ? 'bg-error text-error-foreground' : 'bg-warning text-warning-foreground'}`}>
              {a.severity === 'critical' ? 'Critical' : 'Warning'}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function SupplyChainCommandCenterPage() {
  const { data, isLoading, error } = useInitialData({ T: 4, limit_plants: 200, limit_routes: 300 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const plantLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.plants ?? []) map.set(p.id, p.name || p.id);
    return map;
  }, [data?.plants]);

  const summary = useMemo<SummaryStats>(() => {
    if (!data) return { totalNetworkCost: 0, demandFulfilment: 0, totalDemand: 0, totalSupply: 0 };

    const totalDemand = Object.values(data.demand || {}).reduce((sum, arr) => sum + arr.reduce((a, b) => a + b, 0), 0);

    const totalSupply = (data.plants || []).reduce((sum, p) => {
      if (p.type !== 'IU') return sum;
      const perPeriod = p.max_production_per_period ?? (p.max_capacity / Math.max(1, data.T));
      return sum + perPeriod * data.T;
    }, 0);

    const fulfilment = totalDemand > 0 ? Math.min(100, (totalSupply / totalDemand) * 100) : 100;

    const totalNetworkCost = (data.routes || []).reduce((sum, r) => {
      return (
        sum +
        r.modes.reduce((mSum, m) => {
          const basis = r.minimum_shipment_batch_quantity || m.capacity_per_trip || 1;
          return mSum + m.unit_cost * basis;
        }, 0)
      );
    }, 0);

    return { totalNetworkCost, demandFulfilment: fulfilment, totalDemand, totalSupply };
  }, [data]);

  const routeRows = useMemo<RouteRow[]>(() => {
    if (!data) return [];
    const rows: RouteRow[] = [];
    for (const r of data.routes) {
      for (const mode of r.modes) {
        const cost = Number.isFinite(mode.unit_cost) ? mode.unit_cost : 0;
        const capacity = Number.isFinite(mode.capacity_per_trip) ? mode.capacity_per_trip : 0;
        const minBatch = Number.isFinite(r.minimum_shipment_batch_quantity)
          ? r.minimum_shipment_batch_quantity
          : 0;
        rows.push({
          id: `${r.id}:${mode.mode}`,
          source: plantLabelById.get(r.origin_id) ?? r.origin_id,
          destination: plantLabelById.get(r.destination_id) ?? r.destination_id,
          mode: mode.mode,
          cost,
          capacity,
          minBatch,
          isHighCost: false,
        });
      }
    }
    const costs = rows.map((r) => r.cost).sort((a, b) => a - b);
    const idx = Math.floor(costs.length * 0.85);
    const highCutoff = costs[idx] ?? Number.POSITIVE_INFINITY;
    return rows.map((r) => ({ ...r, isHighCost: r.cost >= highCutoff }));
  }, [data, plantLabelById]);

  const demandCapacitySeries = useMemo(() => {
    if (!data) return [] as { period: number; demand: number; capacity: number }[];
    const periods = Array.from({ length: data.T }, (_, i) => i + 1);
    const demandByPeriod = periods.map((t) =>
      Object.values(data.demand || {}).reduce((sum, series) => sum + (series[t - 1] ?? 0), 0)
    );
    const capacityByPeriod = periods.map(() =>
      (data.plants || []).reduce((sum, p) => {
        if (p.type !== 'IU') return sum;
        const perPeriod = p.max_production_per_period ?? p.max_capacity / Math.max(1, data.T);
        return sum + perPeriod;
      }, 0)
    );
    return periods.map((period, idx) => ({ period, demand: demandByPeriod[idx], capacity: capacityByPeriod[idx] }));
  }, [data]);

  const stockAlerts = useMemo(() => {
    if (!data) return [] as { id: string; plant: string; gap: number; severity: 'critical' | 'warning' }[];

    return (data.plants || [])
      .map((p) => {
        const gap = p.initial_inventory - p.safety_stock;
        const nearThreshold = gap <= p.safety_stock * 0.1;
        const critical = gap <= 0;
        if (!critical && !nearThreshold) return null;
        return {
          id: p.id,
          plant: p.name || p.id,
          gap: Math.abs(gap),
          severity: critical ? 'critical' : 'warning',
        };
      })
      .filter((a): a is { id: string; plant: string; gap: number; severity: 'critical' | 'warning' } => Boolean(a));
  }, [data]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Toggle sidebar"
              >
                <Icon name="Bars3Icon" size={18} />
              </button>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Supply Chain Command Center</p>
                <p className="text-lg font-heading text-foreground">Clinker Optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Icon name="ArrowTrendingUpIcon" size={16} className="text-success" /> {data?.scenario || 'Base'}</div>
              <div className="flex items-center gap-1"><Icon name="Squares2X2Icon" size={16} className="text-accent" /> T={data?.T ?? 0}</div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {error && (
              <div className="rounded-lg border border-error bg-error/10 text-error px-4 py-3">{error.message}</div>
            )}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && data && (
              <>
                <SummaryTopBar stats={summary} />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(data.plants || []).slice(0, 12).map((p) => (
                        <NodeCard key={p.id} plant={p} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-heading text-base text-foreground">Inventory vs Capacity</p>
                          <p className="text-xs text-muted-foreground">IUGUOpeningStock + IUGUType</p>
                        </div>
                        <Icon name="CubeIcon" size={18} className="text-muted-foreground" />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {(data.plants || []).slice(0, 20).map((p) => {
                          const pct = p.max_capacity ? Math.min(100, (p.initial_inventory / p.max_capacity) * 100) : 0;
                          return (
                            <div key={p.id} className="flex items-center gap-3">
                              <div className="w-20 text-xs text-muted-foreground truncate">{p.name || p.id}</div>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`${pct > 90 ? 'bg-error' : pct > 75 ? 'bg-warning' : 'bg-success'} h-full`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="w-12 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <StockAlertPanel alerts={stockAlerts} />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <DemandCapacityChart data={demandCapacitySeries} />
                  <LogisticsTable rows={routeRows.slice(0, 40)} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
