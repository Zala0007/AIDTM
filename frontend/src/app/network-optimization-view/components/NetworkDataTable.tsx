'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface NetworkRoute {
  id: string;
  source: string;
  destination: string;
  mode: 'rail' | 'road';
  modeLabel: 'T1' | 'T2';
  cost: number;
  capacity: number;
  minBatch: number;
  utilization: number;
}

interface NetworkDataTableProps {
  routes: NetworkRoute[];
  selectedMode: 'all' | 'rail' | 'road';
  className?: string;
}

type SortField = 'source' | 'destination' | 'mode' | 'cost' | 'capacity' | 'minBatch' | 'utilization';
type SortDirection = 'asc' | 'desc';

const NetworkDataTable = ({
  routes,
  selectedMode,
  className = '',
}: NetworkDataTableProps) => {
  const [sortField, setSortField] = useState<SortField>('cost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 25;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedRoutes = useMemo(() => {
    let filtered = routes;

    if (selectedMode !== 'all') {
      filtered = filtered.filter((route) => route.mode === selectedMode);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (route) =>
          route.source.toLowerCase().includes(term) ||
          route.destination.toLowerCase().includes(term) ||
          route.modeLabel.toLowerCase().includes(term)
      );
    }

    return [...filtered].sort((a, b) => {
      const aValue = sortField === 'mode' ? a.modeLabel : a[sortField];
      const bValue = sortField === 'mode' ? b.modeLabel : b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [routes, selectedMode, searchTerm, sortField, sortDirection]);

  useEffect(() => {
    setPage(1);
  }, [selectedMode, searchTerm, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRoutes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedRoutes = filteredAndSortedRoutes.slice(startIndex, endIndex);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'rail':
        return 'TruckIcon';
      case 'road':
        return 'TruckIcon';
      default:
        return 'EllipsisHorizontalIcon';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'rail':
        return 'text-accent';
      case 'road':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-error';
    if (utilization >= 75) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search routes by source or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-md font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-md">
          <Icon name="FunnelIcon" size={18} className="text-muted-foreground" />
          <span className="font-body text-sm text-foreground">
            {filteredAndSortedRoutes.length} routes
          </span>
        </div>
      </div>

      <div className="overflow-x-auto bg-card border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {[
                { field: 'source' as SortField, label: 'Source (IU)' },
                { field: 'destination' as SortField, label: 'Destination (GU)' },
                { field: 'mode' as SortField, label: 'Mode (T1/T2)' },
                { field: 'cost' as SortField, label: 'Freight Cost (INR)' },
                { field: 'capacity' as SortField, label: 'Cap/Trip (MT)' },
                { field: 'minBatch' as SortField, label: 'Min Batch (MT)' },
                { field: 'utilization' as SortField, label: 'Utilization' },
              ].map(({ field, label }) => (
                <th
                  key={field}
                  className="px-4 py-3 text-left"
                >
                  <button
                    onClick={() => handleSort(field)}
                    className="flex items-center gap-2 font-body font-semibold text-sm text-foreground hover:text-accent transition-smooth focus-ring rounded px-1"
                  >
                    <span>{label}</span>
                    <Icon
                      name={
                        sortField === field
                          ? sortDirection === 'asc' ?'ChevronUpIcon' :'ChevronDownIcon' :'ChevronUpDownIcon'
                      }
                      size={16}
                      className={sortField === field ? 'text-accent' : 'text-muted-foreground'}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRoutes.map((route, index) => (
              <tr
                key={route.id}
                className={`border-b border-border transition-smooth hover:bg-muted/30 ${
                  index % 2 === 0 ? 'bg-background' : 'bg-card'
                }`}
              >
                <td className="px-4 py-3 font-body text-sm text-foreground font-medium">
                  {route.source}
                </td>
                <td className="px-4 py-3 font-body text-sm text-foreground font-medium">
                  {route.destination}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={getModeIcon(route.mode) as any}
                      size={16}
                      className={getModeColor(route.mode)}
                    />
                     <span className="font-body text-sm text-foreground capitalize">
                       {route.modeLabel}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-data text-sm text-foreground">
                  ₹{route.cost.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-data text-sm text-foreground">
                  {route.capacity.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-data text-sm text-foreground">
                  {route.minBatch.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-smooth ${
                          route.utilization >= 90
                            ? 'bg-error'
                            : route.utilization >= 75
                            ? 'bg-warning' :'bg-success'
                        }`}
                        style={{ width: `${route.utilization}%` }}
                      />
                    </div>
                    <span
                      className={`font-data text-sm font-medium ${getUtilizationColor(
                        route.utilization
                      )}`}
                    >
                      {route.utilization}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="font-caption text-xs text-muted-foreground">
          Showing {filteredAndSortedRoutes.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredAndSortedRoutes.length)} of {filteredAndSortedRoutes.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 bg-card border border-border rounded-md font-body text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-smooth focus-ring"
          >
            Prev
          </button>
          <span className="font-body text-sm text-muted-foreground">
            Page {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 bg-card border border-border rounded-md font-body text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-smooth focus-ring"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkDataTable;