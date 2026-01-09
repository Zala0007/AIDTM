'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FlowConnection {
  id: string;
  source: string;
  destination: string;
  mode: 'rail' | 'road' | 'other';
  utilization: number;
  cost: number;
}

interface NetworkFlowVisualizationProps {
  connections: FlowConnection[];
  selectedMode: string;
  className?: string;
  selectedPlant?: string | null;
  onPlantClick?: (plantName: string) => void;
}

const NetworkFlowVisualization = ({
  connections,
  selectedMode,
  className = '',
  selectedPlant,
  onPlantClick,
}: NetworkFlowVisualizationProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const filteredConnections = useMemo(
    () =>
      selectedMode === 'all'
        ? connections
        : connections.filter((conn) => conn.mode === selectedMode),
    [connections, selectedMode]
  );

  const shortLabel = (label: string) => {
    const trimmed = label.trim();
    if (trimmed.length <= 14) return trimmed;
    return `${trimmed.slice(0, 12)}…`;
  };

  const modeClass = (mode: FlowConnection['mode']) => {
    switch (mode) {
      case 'rail':
        return 'text-accent';
      case 'road':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getUtilizationWidth = (utilization: number) => {
    return Math.max(2, (utilization / 100) * 6);
  };

  const layout = useMemo(() => {
    // Keep the diagram readable when we have many plants.
    // We pick the top sources/destinations by connection count.
    const counts = {
      source: new Map<string, number>(),
      destination: new Map<string, number>(),
    };

    for (const c of filteredConnections) {
      counts.source.set(c.source, (counts.source.get(c.source) ?? 0) + 1);
      counts.destination.set(c.destination, (counts.destination.get(c.destination) ?? 0) + 1);
    }

    const rank = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);

    const maxNodesPerSide = 10;
    const sources = rank(counts.source).slice(0, maxNodesPerSide);
    const destinations = rank(counts.destination).slice(0, maxNodesPerSide);

    const viewWidth = 900;
    const nodeRadius = 28;
    const leftX = 170;
    const rightX = viewWidth - 170;
    const topPad = 60;
    const rowGap = 66;
    const rows = Math.max(1, Math.max(sources.length, destinations.length));
    const viewHeight = Math.max(520, topPad * 2 + (rows - 1) * rowGap + nodeRadius * 2);

    const yForIndex = (i: number) => {
      if (rows === 1) return viewHeight / 2;
      return topPad + i * rowGap;
    };

    const sourcePos = new Map<string, { x: number; y: number }>();
    sources.forEach((s, i) => sourcePos.set(s, { x: leftX, y: yForIndex(i) }));

    const destPos = new Map<string, { x: number; y: number }>();
    destinations.forEach((d, i) => destPos.set(d, { x: rightX, y: yForIndex(i) }));

    const visibleConnections = filteredConnections.filter(
      (c) => sourcePos.has(c.source) && destPos.has(c.destination)
    );

    return {
      viewWidth,
      viewHeight,
      nodeRadius,
      sources,
      destinations,
      sourcePos,
      destPos,
      visibleConnections,
    };
  }, [filteredConnections]);

  if (!isHydrated) {
    return (
      <div className={`flex items-center justify-center h-full bg-card border border-border rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Icon name="ArrowPathIcon" size={32} className="text-muted-foreground animate-spin" />
          <p className="font-body text-sm text-muted-foreground">Loading network visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg text-foreground">
          Network Flow Map
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="font-caption text-xs text-muted-foreground">&lt;75%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="font-caption text-xs text-muted-foreground">75-90%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error" />
            <span className="font-caption text-xs text-muted-foreground">&gt;90%</span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-[500px]">
        <div className="h-full max-h-[560px] overflow-auto rounded-md">
          <svg
            width="100%"
            height={layout.viewHeight}
            viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
            className="block"
          >
          <defs>
            <marker
              id="arrowhead-rail"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--color-accent)" />
            </marker>
            <marker
              id="arrowhead-road"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--color-warning)" />
            </marker>
            <marker
              id="arrowhead-other"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--color-muted-foreground)" />
            </marker>
          </defs>

          {layout.sources.map((source) => {
            const pos = layout.sourcePos.get(source);
            if (!pos) return null;
            const isSelected = selectedPlant === source;
            return (
            <g 
              key={`source-${source}`}
              onClick={() => onPlantClick?.(source)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <title>{source}</title>
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={layout.nodeRadius + 8}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                  opacity="0.5"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={layout.nodeRadius}
                fill={isSelected ? "var(--color-accent)" : "var(--color-muted)"}
                stroke="var(--color-accent)"
                strokeWidth={isSelected ? "4" : "3"}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-foreground)"
                fontSize="12"
                fontWeight="600"
                pointerEvents="none"
              >
                {shortLabel(source)}
              </text>
              <text
                x={pos.x}
                y={pos.y + layout.nodeRadius + 18}
                textAnchor="middle"
                fill="var(--color-muted-foreground)"
                fontSize="12"
                pointerEvents="none"
              >
                Integrated Unit
              </text>
            </g>
            );
          })}

          {layout.destinations.map((destination) => {
            const pos = layout.destPos.get(destination);
            if (!pos) return null;
            const isSelected = selectedPlant === destination;
            return (
            <g 
              key={`dest-${destination}`}
              onClick={() => onPlantClick?.(destination)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <title>{destination}</title>
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={layout.nodeRadius + 8}
                  fill="none"
                  stroke="var(--color-success)"
                  strokeWidth="3"
                  opacity="0.5"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={layout.nodeRadius}
                fill={isSelected ? "var(--color-success)" : "var(--color-muted)"}
                stroke="var(--color-success)"
                strokeWidth={isSelected ? "4" : "3"}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-foreground)"
                fontSize="12"
                fontWeight="600"
                pointerEvents="none"
              >
                {shortLabel(destination)}
              </text>
              <text
                x={pos.x}
                y={pos.y + layout.nodeRadius + 18}
                textAnchor="middle"
                fill="var(--color-muted-foreground)"
                fontSize="12"
                pointerEvents="none"
              >
                Grinding Unit
              </text>
            </g>
            );
          })}

          {layout.visibleConnections.map((conn) => {
            const src = layout.sourcePos.get(conn.source);
            const dst = layout.destPos.get(conn.destination);
            if (!src || !dst) return null;

            const x1 = src.x + layout.nodeRadius;
            const y1 = src.y;
            const x2 = dst.x - layout.nodeRadius;
            const y2 = dst.y;

            const dx = x2 - x1;
            const c1x = x1 + dx * 0.35;
            const c2x = x1 + dx * 0.65;
            const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;

            const isSelected = selectedConnection === conn.id;
            const strokeWidth = getUtilizationWidth(conn.utilization);

            const markerId =
              conn.mode === 'rail'
                ? 'url(#arrowhead-rail)'
                : conn.mode === 'road'
                ? 'url(#arrowhead-road)'
                : 'url(#arrowhead-other)';

            return (
              <g
                key={conn.id}
                onMouseEnter={() => setSelectedConnection(conn.id)}
                onMouseLeave={() => setSelectedConnection(null)}
                className={`cursor-pointer transition-smooth ${modeClass(conn.mode)}`}
              >
                <path
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                  opacity={isSelected ? 1 : 0.55}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={markerId}
                  style={{
                    transition:
                      'opacity 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94), stroke-width 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
                {isSelected && (
                  <g>
                    <rect
                      x={(x1 + x2) / 2 - 92}
                      y={(y1 + y2) / 2 - 44}
                      width="160"
                      height="80"
                      fill="var(--color-popover)"
                      stroke="var(--color-border)"
                      strokeWidth="2"
                      rx="8"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 15}
                      textAnchor="middle"
                      fill="var(--color-foreground)"
                      fontSize="12"
                      fontWeight="600"
                    >
                      {conn.source} → {conn.destination}
                    </text>
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 5}
                      textAnchor="middle"
                      fill="var(--color-muted-foreground)"
                      fontSize="11"
                    >
                      Mode: {conn.mode.toUpperCase()}
                    </text>
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 20}
                      textAnchor="middle"
                      fill="var(--color-muted-foreground)"
                      fontSize="11"
                    >
                      Utilization: {conn.utilization}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Icon name="InformationCircleIcon" size={18} className="text-accent" />
          <span className="font-caption text-sm text-muted-foreground">
            Hover over connections to view details
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-caption text-xs text-muted-foreground">
            Visualizing {layout.visibleConnections.length}/{filteredConnections.length}
          </span>
          <span className="font-body text-sm text-foreground">
            <span className="font-semibold">{filteredConnections.length}</span> active routes
          </span>
        </div>
      </div>
    </div>
  );
};

export default NetworkFlowVisualization;