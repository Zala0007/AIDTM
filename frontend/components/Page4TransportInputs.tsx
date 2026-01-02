/**
 * Page 4: Transportation Inputs
 * 
 * Features:
 * - Single source IU selection
 * - Multiple destination selection (multi-destination support)
 * - Transport mode checkboxes (Truck, Rail, Ship)
 * - Mode parameters display (capacity, SBQ, costs)
 * - Transport cost index slider
 * - Consolidation toggle
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TransportMode {
  mode_id: string;
  mode_name: string;
  capacity_tons_per_trip: number;
  min_shipment_batch_tons: number;
  fixed_cost_per_trip: number;
  variable_cost_per_ton: number;
  editable: boolean;
}

interface Plant {
  plant_id: string;
  plant_name: string;
  plant_type: 'IU' | 'GU';
}

const DEFAULT_MODES: TransportMode[] = [
  {
    mode_id: 'truck',
    mode_name: 'Truck (20 Ton)',
    capacity_tons_per_trip: 20,
    min_shipment_batch_tons: 15,
    fixed_cost_per_trip: 500,
    variable_cost_per_ton: 2.5,
    editable: false,
  },
  {
    mode_id: 'rail',
    mode_name: 'Rail Wagon (60 Ton)',
    capacity_tons_per_trip: 60,
    min_shipment_batch_tons: 50,
    fixed_cost_per_trip: 1500,
    variable_cost_per_ton: 1.2,
    editable: false,
  },
  {
    mode_id: 'ship',
    mode_name: 'Coastal Ship (5000 Ton)',
    capacity_tons_per_trip: 5000,
    min_shipment_batch_tons: 3000,
    fixed_cost_per_trip: 15000,
    variable_cost_per_ton: 0.8,
    editable: false,
  },
];

export default function Page4TransportInputs() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [sourceIU, setSourceIU] = useState('');
  const [destinations, setDestinations] = useState<Set<string>>(new Set());
  const [selectedModes, setSelectedModes] = useState<Set<string>>(new Set(['truck', 'rail']));
  const [transportModes, setTransportModes] = useState<TransportMode[]>(DEFAULT_MODES);
  const [consolidationEnabled, setConsolidationEnabled] = useState(true);
  const [costIndex, setCostIndex] = useState(1.0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load data from previous pages
    const page3Result = sessionStorage.getItem('page3Result');
    const page2Data = sessionStorage.getItem('page2Data');
    
    if (page2Data) {
      const data = JSON.parse(page2Data);
      const allPlants = [
        ...data.selected_ius.map((id: string) => ({ plant_id: id, plant_name: id, plant_type: 'IU' })),
        ...data.selected_gus.map((id: string) => ({ plant_id: id, plant_name: id, plant_type: 'GU' })),
      ];
      setPlants(allPlants);
      if (data.selected_ius.length > 0) {
        setSourceIU(data.selected_ius[0]);
      }
      
      // Auto-populate destinations from GUs
      const guIds = data.selected_gus || [];
      if (guIds.length > 0) {
        setDestinations(new Set(guIds));
      }
    }
    
    // If page3 has results, extract destinations from allocation routes
    if (page3Result) {
      try {
        const page3Data = JSON.parse(page3Result);
        if (page3Data.allocation_routes && page3Data.allocation_routes.length > 0) {
          const destIds = new Set<string>(page3Data.allocation_routes.map((r: any) => r.to_plant_id));
          setDestinations(destIds);
        }
      } catch (err) {
        console.error('Failed to parse page3 result:', err);
      }
    }
    
    if (!page2Data) {
      // Fetch fallback
      fetchPlants();
    }
  }, []);

  const fetchPlants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/page1/all-plants`);
      const data = await response.json();
      const sample = data.all_plants.slice(0, 10);
      setPlants(sample);
      const firstIU = sample.find((p: Plant) => p.plant_type === 'IU');
      if (firstIU) setSourceIU(firstIU.plant_id);
    } catch (err) {
      setError('Failed to load plants');
    }
  };

  const toggleDestination = (plantId: string) => {
    const newDest = new Set(destinations);
    if (newDest.has(plantId)) {
      newDest.delete(plantId);
    } else {
      newDest.add(plantId);
    }
    setDestinations(newDest);
  };

  const toggleMode = (modeId: string) => {
    const newModes = new Set(selectedModes);
    if (newModes.has(modeId)) {
      newModes.delete(modeId);
    } else {
      newModes.add(modeId);
    }
    setSelectedModes(newModes);
  };

  const handleProceed = () => {
    if (!sourceIU) {
      setError('Please select a source IU');
      return;
    }
    
    const destArray = Array.from(destinations);
    if (destArray.length === 0) {
      setError('Please select at least one destination. Click on destination plants below to select them.');
      return;
    }
    
    if (selectedModes.size === 0) {
      setError('Please select at least one transport mode');
      return;
    }

    // Store data
    const page4Data = {
      source_iu_id: sourceIU,
      destination_ids: destArray,
      available_modes: transportModes.filter(m => selectedModes.has(m.mode_id)),
      consolidation_enabled: consolidationEnabled,
      transport_cost_index: costIndex,
    };
    
    console.log('Page 4 Data being saved:', page4Data);
    sessionStorage.setItem('page4Data', JSON.stringify(page4Data));
    window.location.href = '/page5';
  };

  const ius = plants.filter(p => p.plant_type === 'IU');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Transportation Inputs</h1>
              <p className="text-slate-300 mt-1">Configure transport modes and parameters</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">Page 4 of 8</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Source Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Source IU</CardTitle>
            <CardDescription>Select the origin Integrated Unit</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={sourceIU}
              onChange={(e) => setSourceIU(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-slate-600 rounded-md"
            >
              <option value="">Select Source IU</option>
              {ius.map(iu => (
                <option key={iu.plant_id} value={iu.plant_id}>{iu.plant_name}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Destination Selection */}
        <Card>
          <CardHeader>
            <CardTitle>
              Destinations (Multi-Select)
              <Badge className="ml-3 bg-blue-600">{destinations.size} Selected</Badge>
            </CardTitle>
            <CardDescription>
              Click on plants below to select/deselect destinations. Multiple destinations may be served through shared transportation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {plants
                .filter(p => p.plant_id !== sourceIU)
                .map(plant => (
                  <button
                    key={plant.plant_id}
                    onClick={() => toggleDestination(plant.plant_id)}
                    className={`px-4 py-2 rounded-lg border text-sm transition ${
                      destinations.has(plant.plant_id)
                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400'
                        : 'bg-slate-800 text-slate-200 border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    {plant.plant_name}
                    <Badge className={`ml-2 ${
                      plant.plant_type === 'IU' ? 'bg-blue-100 text-blue-200' : 'bg-orange-100 text-orange-200'
                    }`}>
                      {plant.plant_type}
                    </Badge>
                  </button>
                ))}
            </div>
            <div className="mt-4 text-sm text-slate-300">
              Selected: {destinations.size} destination(s)
            </div>
          </CardContent>
        </Card>

        {/* Transport Modes */}
        <Card>
          <CardHeader>
            <CardTitle>Transport Modes</CardTitle>
            <CardDescription>Select available transportation options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {transportModes.map(mode => (
                <div
                  key={mode.mode_id}
                  onClick={() => toggleMode(mode.mode_id)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedModes.has(mode.mode_id)
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedModes.has(mode.mode_id)}
                      onChange={() => {}}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-semibold">{mode.mode_name}</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span>Capacity:</span>
                      <span className="font-medium">{mode.capacity_tons_per_trip} tons/trip</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Batch (SBQ):</span>
                      <span className="font-medium">{mode.min_shipment_batch_tons} tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fixed Cost:</span>
                      <span className="font-medium">${mode.fixed_cost_per_trip}/trip</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Variable Cost:</span>
                      <span className="font-medium">${mode.variable_cost_per_ton}/ton</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Consolidation & Cost Index */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Settings</CardTitle>
            <CardDescription>Configure transportation optimization parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Consolidation Toggle */}
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consolidationEnabled}
                  onChange={(e) => setConsolidationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <div>
                <div className="font-medium">Enable Consolidation</div>
                <div className="text-sm text-slate-400">
                  Allow multiple destinations to share transportation trips
                </div>
              </div>
            </div>

            {/* Cost Index */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Transport Cost Index: {costIndex.toFixed(2)}x
              </label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.1}
                value={costIndex}
                onChange={(e) => setCostIndex(parseFloat(e.target.value))}
                className="w-full max-w-md"
              />
              <div className="flex justify-between text-xs text-slate-400 max-w-md">
                <span>0.5x (Low fuel prices)</span>
                <span>1.0x</span>
                <span>1.5x (High fuel prices)</span>
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-600 hover:text-blue-200 text-sm"
              >
                {showAdvanced ? '▼ Hide Advanced Settings' : '▶ Show Advanced Settings'}
              </button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                  <p className="text-sm text-slate-300 mb-4">
                    Advanced settings allow you to modify transport mode parameters.
                  </p>
                  <p className="text-sm text-slate-400 italic">
                    (Advanced editing not available in this demo)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-slate-300">Source</div>
                <div className="font-bold text-lg">{sourceIU || '-'}</div>
              </div>
              <div className="bg-orange-900/20 p-4 rounded-lg">
                <div className="text-sm text-slate-300">Destinations</div>
                <div className="font-bold text-lg">{destinations.size}</div>
              </div>
              <div className="bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-slate-300">Transport Modes</div>
                <div className="font-bold text-lg">{selectedModes.size}</div>
              </div>
              <div className="bg-purple-900/20 p-4 rounded-lg">
                <div className="text-sm text-slate-300">Consolidation</div>
                <div className="font-bold text-lg">{consolidationEnabled ? 'ON' : 'OFF'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Page 3
          </Button>
          
          <Button
            onClick={handleProceed}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Proceed to Transportation Optimization (Page 5) →
          </Button>
        </div>
      </div>
    </div>
  );
}




