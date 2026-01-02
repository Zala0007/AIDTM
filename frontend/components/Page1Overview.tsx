/**
 * Page 1: India Cement Network Overview
 * 
 * Features:
 * - Interactive map showing all Indian cement plants
 * - Filter by State, Region, Company
 * - Multi-select plant capability
 * - Real-time KPI updates
 * - Proceed to Page 2 only when plants selected
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Plant {
  plant_id: string;
  plant_name: string;
  plant_type: 'IU' | 'GU';
  state: string;
  region: string;
  location_lat: number;
  location_lon: number;
  company: string;
  capacity_tons: number;
}

interface FilterOptions {
  states: string[];
  regions: string[];
  companies: string[];
}

interface NetworkStats {
  total_ius_india: number;
  total_gus_india: number;
  total_plants_india: number;
  selected_ius_count: number;
  selected_gus_count: number;
  selected_plants_count: number;
}

export default function Page1Overview() {
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ states: [], regions: [], companies: [] });
  const [filters, setFilters] = useState({
    state: '',
    region: '',
    company: '',
  });
  const [stats, setStats] = useState<NetworkStats>({
    total_ius_india: 0,
    total_gus_india: 0,
    total_plants_india: 0,
    selected_ius_count: 0,
    selected_gus_count: 0,
    selected_plants_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/page1/filters`);
        const data = await response.json();
        setFilterOptions(data);
      } catch (err) {
        setError('Failed to load filter options');
      }
    };
    fetchFilters();
  }, []);

  // Fetch plants with filters
  useEffect(() => {
    const fetchPlants = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.state) params.append('state', filters.state);
        if (filters.region) params.append('region', filters.region);
        if (filters.company) params.append('company', filters.company);
        
        // Add selected plant IDs to params
        selectedPlantIds.forEach(id => params.append('selected_plant_ids', id));

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/page1/all-plants?${params.toString()}`
        );
        const data = await response.json();
        
        setAllPlants(data.all_plants);
        setStats(data.kpis);
        setError('');
      } catch (err) {
        setError('Failed to load plants');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPlants, 500);
    return () => clearTimeout(timer);
  }, [filters, selectedPlantIds]);

  const togglePlantSelection = (plantId: string) => {
    const newSelection = new Set(selectedPlantIds);
    if (newSelection.has(plantId)) {
      newSelection.delete(plantId);
    } else {
      newSelection.add(plantId);
    }
    setSelectedPlantIds(newSelection);
  };

  const selectAllFiltered = () => {
    const allIds = new Set(allPlants.map(p => p.plant_id));
    setSelectedPlantIds(allIds);
  };

  const clearSelection = () => {
    setSelectedPlantIds(new Set());
  };

  const handleProceed = () => {
    if (selectedPlantIds.size === 0) {
      setError('Please select at least one plant to proceed');
      return;
    }
    // Navigate to Page 2 with selected plants
    window.location.href = `/page2?plants=${Array.from(selectedPlantIds).join(',')}`;
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-full mx-auto px-8 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">🇮🇳 India Cement Network Overview</h1>
              <p className="text-slate-300 mt-1">Select cement plants for optimization planning</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">Page 1 of 8</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-8 py-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.total_ius_india}</div>
            <div className="text-xs text-slate-300 mt-1">Total IUs</div>
          </div>
          <div className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 border border-orange-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">{stats.total_gus_india}</div>
            <div className="text-xs text-slate-300 mt-1">Total GUs</div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.total_plants_india}</div>
            <div className="text-xs text-slate-300 mt-1">All Plants</div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.selected_ius_count}</div>
            <div className="text-xs text-slate-300 mt-1">Selected IUs</div>
          </div>
          <div className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 border border-orange-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">{stats.selected_gus_count}</div>
            <div className="text-xs text-slate-300 mt-1">Selected GUs</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{stats.selected_plants_count}</div>
            <div className="text-xs text-slate-300 mt-1">Total Selected</div>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-300 mb-1">Filter by State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-white"
              >
                <option value="">All States</option>
                {filterOptions.states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-300 mb-1">Filter by Region</label>
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-white"
              >
                <option value="">All Regions</option>
                {filterOptions.regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-300 mb-1">Filter by Company</label>
              <select
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-white"
              >
                <option value="">All Companies</option>
                {filterOptions.companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <Button onClick={selectAllFiltered} variant="outline" size="sm">
                Select All
              </Button>
              <Button onClick={clearSelection} variant="outline" size="sm">
                Clear
              </Button>
              <Button 
                onClick={handleProceed} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={selectedPlantIds.size === 0}
                size="sm"
              >
                Proceed →
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-3 bg-red-900/20 border border-red-700 text-red-300 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Plant Cards - Full Width */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* IUs Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-white">🏭 Integrated Units (IUs)</h3>
                  <Badge className="bg-blue-600">Production Plants</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allPlants
                    .filter(p => p.plant_type === 'IU')
                    .map(plant => (
                      <Card
                        key={plant.plant_id}
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${
                          selectedPlantIds.has(plant.plant_id)
                            ? 'ring-2 ring-blue-500 bg-blue-900/30 shadow-xl shadow-blue-500/20'
                            : 'hover:shadow-lg'
                        }`}
                        onClick={() => togglePlantSelection(plant.plant_id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-bold">{plant.plant_name}</CardTitle>
                              <CardDescription className="text-xs">{plant.plant_id}</CardDescription>
                            </div>
                            <Badge className="bg-blue-600 text-white">IU</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">State:</span>
                            <span className="font-medium text-white">{plant.state}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Region:</span>
                            <span className="font-medium text-white">{plant.region}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Company:</span>
                            <span className="font-medium text-white truncate ml-2">{plant.company}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-700">
                            <span className="text-slate-400">Capacity:</span>
                            <span className="font-bold text-blue-400">{plant.capacity_tons.toLocaleString()} t</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>

              {/* GUs Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-white">🔧 Grinding Units (GUs)</h3>
                  <Badge className="bg-orange-600">Consumption Centers</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allPlants
                    .filter(p => p.plant_type === 'GU')
                    .map(plant => (
                      <Card
                        key={plant.plant_id}
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${
                          selectedPlantIds.has(plant.plant_id)
                            ? 'ring-2 ring-orange-500 bg-orange-900/30 shadow-xl shadow-orange-500/20'
                            : 'hover:shadow-lg'
                        }`}
                        onClick={() => togglePlantSelection(plant.plant_id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-bold">{plant.plant_name}</CardTitle>
                              <CardDescription className="text-xs">{plant.plant_id}</CardDescription>
                            </div>
                            <Badge className="bg-orange-600 text-white">GU</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">State:</span>
                            <span className="font-medium text-white">{plant.state}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Region:</span>
                            <span className="font-medium text-white">{plant.region}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Company:</span>
                            <span className="font-medium text-white truncate ml-2">{plant.company}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-700">
                            <span className="text-slate-400">Capacity:</span>
                            <span className="font-bold text-orange-400">{plant.capacity_tons.toLocaleString()} t</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}




