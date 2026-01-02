/**
 * Page 6: Map Visualization
 * 
 * Features:
 * - Interactive India map showing all plants
 * - IU/GU nodes with color coding
 * - Flow lines showing allocation/transportation routes
 * - Hover tooltips with plant details
 * - Animated flow visualization
 * - Legend and controls
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlantNode {
  id: string;
  name: string;
  type: 'IU' | 'GU';
  x: number;
  y: number;
  capacity: number;
  state: string;
}

interface FlowRoute {
  from: string;
  to: string;
  tons: number;
  mode: string;
}

// Simplified India map coordinates for major cement states
const STATE_POSITIONS: Record<string, { x: number; y: number }> = {
  'Gujarat': { x: 170, y: 280 },
  'Rajasthan': { x: 220, y: 200 },
  'Maharashtra': { x: 230, y: 340 },
  'Madhya Pradesh': { x: 290, y: 280 },
  'Andhra Pradesh': { x: 310, y: 400 },
  'Tamil Nadu': { x: 310, y: 480 },
  'Karnataka': { x: 250, y: 420 },
  'Uttar Pradesh': { x: 340, y: 220 },
  'West Bengal': { x: 450, y: 280 },
  'Bihar': { x: 420, y: 230 },
  'Odisha': { x: 410, y: 320 },
  'Jharkhand': { x: 400, y: 270 },
  'Chhattisgarh': { x: 360, y: 320 },
  'Telangana': { x: 310, y: 370 },
  'Kerala': { x: 260, y: 500 },
  'Punjab': { x: 260, y: 140 },
  'Haryana': { x: 270, y: 170 },
  'Himachal Pradesh': { x: 290, y: 120 },
  'Assam': { x: 530, y: 230 },
  'Meghalaya': { x: 510, y: 250 },
};

export default function Page6MapVisualization() {
  const [plants, setPlants] = useState<PlantNode[]>([]);
  const [routes, setRoutes] = useState<FlowRoute[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantNode | null>(null);
  const [showFlows, setShowFlows] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'IU' | 'GU'>('all');
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    // Load from previous pages
    const page3Result = sessionStorage.getItem('page3Result');
    const page5Result = sessionStorage.getItem('page5Result');
    
    // Generate sample plants based on states
    const samplePlants: PlantNode[] = [];
    const states = Object.keys(STATE_POSITIONS);
    
    // Create IUs
    for (let i = 0; i < 10; i++) {
      const state = states[i % states.length];
      const pos = STATE_POSITIONS[state];
      samplePlants.push({
        id: `IU-${String(i + 1).padStart(3, '0')}`,
        name: `Integrated Unit ${i + 1}`,
        type: 'IU',
        x: pos.x + (Math.random() - 0.5) * 40,
        y: pos.y + (Math.random() - 0.5) * 40,
        capacity: 3000 + Math.random() * 5000,
        state,
      });
    }
    
    // Create GUs
    for (let i = 0; i < 15; i++) {
      const state = states[(i + 5) % states.length];
      const pos = STATE_POSITIONS[state];
      samplePlants.push({
        id: `GU-${String(i + 1).padStart(3, '0')}`,
        name: `Grinding Unit ${i + 1}`,
        type: 'GU',
        x: pos.x + (Math.random() - 0.5) * 40,
        y: pos.y + (Math.random() - 0.5) * 40,
        capacity: 1000 + Math.random() * 2000,
        state,
      });
    }
    
    setPlants(samplePlants);

    // Generate sample routes
    const sampleRoutes: FlowRoute[] = [];
    const ius = samplePlants.filter(p => p.type === 'IU');
    const gus = samplePlants.filter(p => p.type === 'GU');
    
    ius.forEach(iu => {
      const targetGUs = gus.slice(0, 2 + Math.floor(Math.random() * 3));
      targetGUs.forEach(gu => {
        sampleRoutes.push({
          from: iu.id,
          to: gu.id,
          tons: 500 + Math.random() * 1500,
          mode: Math.random() > 0.5 ? 'Truck' : 'Rail',
        });
      });
    });
    
    setRoutes(sampleRoutes);
  };

  const getPlantById = (id: string) => plants.find(p => p.id === id);

  const filteredPlants = plants.filter(p => 
    filterType === 'all' || p.type === filterType
  );

  const filteredRoutes = routes.filter(r => {
    const from = getPlantById(r.from);
    const to = getPlantById(r.to);
    if (filterType === 'all') return true;
    return from?.type === filterType || to?.type === filterType;
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Map Visualization</h1>
              <p className="text-slate-300 mt-1">Interactive view of clinker flow network</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">Page 6 of 8</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-200">Plant Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-white"
                  >
                    <option value="all">All Plants</option>
                    <option value="IU">Integrated Units Only</option>
                    <option value="GU">Grinding Units Only</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showFlows"
                    checked={showFlows}
                    onChange={(e) => setShowFlows(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="showFlows" className="text-sm">Show Flow Lines</label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">Integrated Unit (IU)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-orange-900/200 rounded-full"></div>
                  <span className="text-sm">Grinding Unit (GU)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-green-900/200"></div>
                  <span className="text-sm">Truck Route</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-purple-900/200" style={{ borderTop: '2px dashed' }}></div>
                  <span className="text-sm">Rail Route</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Plants</span>
                  <span className="font-bold">{plants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">IUs</span>
                  <span className="font-bold text-blue-600">
                    {plants.filter(p => p.type === 'IU').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">GUs</span>
                  <span className="font-bold text-orange-600">
                    {plants.filter(p => p.type === 'GU').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Active Routes</span>
                  <span className="font-bold text-green-600">{routes.length}</span>
                </div>
              </CardContent>
            </Card>

            {selectedPlant && (
              <Card className="bg-blue-900/20 border-blue-700">
                <CardHeader>
                  <CardTitle className="text-blue-200">Selected Plant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {selectedPlant.id}</div>
                  <div><strong>Name:</strong> {selectedPlant.name}</div>
                  <div><strong>Type:</strong> {selectedPlant.type}</div>
                  <div><strong>State:</strong> {selectedPlant.state}</div>
                  <div><strong>Capacity:</strong> {selectedPlant.capacity.toFixed(0)} tons/day</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-4">
                <svg
                  ref={svgRef}
                  viewBox="100 80 500 480"
                  className="w-full h-[600px] bg-slate-700 rounded-lg"
                >
                  {/* India outline (simplified) */}
                  <path
                    d="M170 120 L280 100 L380 120 L450 180 L530 230 L500 280 L440 320 L410 400 L340 480 L300 520 L260 500 L240 420 L200 380 L160 300 L170 200 Z"
                    fill="#e2e8f0"
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                  
                  {/* Flow lines */}
                  {showFlows && filteredRoutes.map((route, idx) => {
                    const from = getPlantById(route.from);
                    const to = getPlantById(route.to);
                    if (!from || !to) return null;
                    
                    const isTruck = route.mode === 'Truck';
                    return (
                      <line
                        key={idx}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={isTruck ? '#22c55e' : '#8b5cf6'}
                        strokeWidth={Math.max(1, Math.log(route.tons / 100))}
                        strokeDasharray={isTruck ? 'none' : '5,5'}
                        opacity={0.6}
                        className="transition-opacity hover:opacity-100"
                      >
                        <title>{`${route.from} → ${route.to}: ${route.tons.toFixed(0)} tons (${route.mode})`}</title>
                      </line>
                    );
                  })}

                  {/* Plant nodes */}
                  {filteredPlants.map(plant => (
                    <g
                      key={plant.id}
                      transform={`translate(${plant.x}, ${plant.y})`}
                      onClick={() => setSelectedPlant(plant)}
                      className="cursor-pointer"
                    >
                      <circle
                        r={plant.type === 'IU' ? 8 : 6}
                        fill={plant.type === 'IU' ? '#2563eb' : '#f97316'}
                        stroke="white"
                        strokeWidth="2"
                        className="transition-transform hover:scale-125"
                      />
                      <text
                        y={-12}
                        textAnchor="middle"
                        className="text-[8px] fill-slate-700 font-medium pointer-events-none"
                      >
                        {plant.id}
                      </text>
                    </g>
                  ))}
                </svg>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Page 5
          </Button>
          
          <Button
            onClick={() => window.location.href = '/page7'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Proceed to Cost Summary (Page 7) →
          </Button>
        </div>
      </div>
    </div>
  );
}




