'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import * as ExcelAPI from '@/lib/excelApi';

// Types based on GitHub repo structure
type RouteData = ExcelAPI.RouteData;
type TransportMode = ExcelAPI.TransportMode;
type MathModel = ExcelAPI.MathematicalModel['model'];

interface DataStatus {
  loaded: boolean;
  source: string;
  sheets: string[];
  total_routes: number;
  total_plants: number;
  total_periods?: number;
  periods: string[];
}

interface DecisionVariable {
  name: string;
  value: number;
  unit: string;
  description: string;
  formula?: string;
}

interface MassBalanceNode {
  I_0: number;
  P_t: number;
  inbound: number;
  outbound: number;
  D_t: number;
  I_t: number;
  equation_string: string;
}

interface Constraint {
  name: string;
  formula: string;
  lhs?: number;
  rhs?: number | string;
  satisfied?: boolean;
  slack?: number;
  utilization_pct?: number;
}

interface PerformanceMetrics {
  capacity_utilization_pct: number;
  demand_fulfillment_pct: number;
  inventory_turnover_source: number;
  inventory_turnover_dest: number;
  transport_efficiency: number;
  cost_breakdown_pct: {
    production: number;
    transport: number;
    holding: number;
  };
}

const NOT_AVAILABLE = 'N/A';

const AdvancedOptimizationInteractive = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'model' | 'analytics'>('upload');
  
  // Data state
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [modes, setModes] = useState<TransportMode[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [mathModel, setMathModel] = useState<MathModel | null>(null);
  
  // Selection state
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  // Route data
  const [routeData, setRouteData] = useState<any>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showModel, setShowModel] = useState(false);

  // Load default data on mount
  useEffect(() => {
    loadDefaultData();
    fetchMathModel();
  }, []);

  const fetchMathModel = async () => {
    try {
      const data = await ExcelAPI.getMathematicalModel();
      if (data.success) {
        setMathModel(data.model);
      }
    } catch (err) {
      console.error('Failed to fetch model:', err);
    }
  };

  const loadDefaultData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ExcelAPI.loadDefaultData();
      if (data.success) {
        setDataStatus({
          loaded: true,
          source: 'CSV files from project folder',
          sheets: data.sheets_found || [],
          total_routes: data.total_routes || 0,
          total_plants: data.total_plants || 0,
          periods: data.periods || []
        });
        await fetchSources();
        await fetchPeriods();
      } else {
        setError('Failed to load default data');
      }
    } catch (err) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setValidationErrors([]);
    
    try {
      const data = await ExcelAPI.uploadExcelFile(file);
      
      if (data.success) {
        setDataStatus({
          loaded: true,
          source: file.name,
          sheets: data.sheets_found || [],
          total_routes: data.total_routes || 0,
          total_plants: data.total_plants || 0,
          periods: data.periods || []
        });
        setSelectedSource('');
        setSelectedDestination('');
        setSelectedMode('');
        setSelectedPeriod('');
        setRouteData(null);
        await fetchSources();
        await fetchPeriods();
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setValidationErrors(data.errors);
        } else {
          setError('Failed to parse file');
        }
      }
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const sources = await ExcelAPI.getSources();
      setSources(sources);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  };

  const fetchPeriods = async () => {
    try {
      const periods = await ExcelAPI.getPeriods();
      setPeriods(periods);
    } catch (err) {
      console.error('Failed to fetch periods:', err);
    }
  };

  const fetchDestinations = async (source: string) => {
    if (!source) {
      setDestinations([]);
      return;
    }
    try {
      const destinations = await ExcelAPI.getDestinations(source);
      setDestinations(destinations);
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
    }
  };

  const fetchModes = async (source: string, destination: string) => {
    if (!source || !destination) {
      setModes([]);
      return;
    }
    try {
      const modes = await ExcelAPI.getModes(source, destination);
      setModes(modes);
    } catch (err) {
      console.error('Failed to fetch modes:', err);
    }
  };

  const fetchRouteData = async () => {
    if (!selectedSource || !selectedDestination || !selectedMode || !selectedPeriod) {
      return;
    }
    setLoading(true);
    try {
      const data = await ExcelAPI.getRouteData(
        selectedSource,
        selectedDestination,
        selectedMode,
        selectedPeriod
      );
      setRouteData(data);
    } catch (err) {
      console.error('Failed to fetch route data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = async (value: string) => {
    setSelectedSource(value);
    setSelectedDestination('');
    setSelectedMode('');
    setRouteData(null);
    await fetchDestinations(value);
  };

  const handleDestinationChange = async (value: string) => {
    setSelectedDestination(value);
    setSelectedMode('');
    setRouteData(null);
    await fetchModes(selectedSource, value);
  };

  const handleModeChange = (value: string) => {
    setSelectedMode(value);
    setRouteData(null);
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setRouteData(null);
  };

  useEffect(() => {
    if (selectedSource && selectedDestination && selectedMode && selectedPeriod) {
      fetchRouteData();
    }
  }, [selectedSource, selectedDestination, selectedMode, selectedPeriod]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setValidationErrors([]);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    } else {
      setError('Please upload an Excel file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([]);
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getTransportIcon = (mode: string): string => {
    const modeUpper = mode.toUpperCase();
    if (modeUpper.includes('ROAD') || modeUpper === 'T1') return 'truck';
    if (modeUpper.includes('RAIL') || modeUpper === 'T2') return 'building-office-2';
    if (modeUpper.includes('SEA') || modeUpper === 'T3') return 'archive-box';
    return 'truck';
  };

  const formatValue = (value: any, suffix: string = '') => {
    if (value === NOT_AVAILABLE || value === null || value === undefined) {
      return <span className="text-muted-foreground italic text-xs">{NOT_AVAILABLE}</span>;
    }
    if (typeof value === 'number') {
      return `${value.toLocaleString()}${suffix}`;
    }
    return `${value}${suffix}`;
  };

  const tabs = [
    { id: 'upload' as const, label: 'Data Upload & Analysis', icon: 'cloud-arrow-up' },
    { id: 'model' as const, label: 'Mathematical Model', icon: 'calculator' },
    { id: 'analytics' as const, label: 'Route Analytics', icon: 'chart-bar' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl p-6 border-2 border-accent/20">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-lg bg-accent text-white flex items-center justify-center shadow-lg">
            <Icon name="cube" className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Advanced OR Platform</h1>
            <p className="text-muted-foreground">
              Excel-driven MILP optimization with comprehensive analytics
            </p>
          </div>
        </div>
        {dataStatus?.loaded && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Icon name="check-circle" className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">Dataset Loaded</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="document-text" className="w-4 h-4" />
              <span>{dataStatus.sheets.length} sheets</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="building-office" className="w-4 h-4" />
              <span>{dataStatus.total_plants} plants</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="arrow-trending-up" className="w-4 h-4" />
              <span>{dataStatus.total_routes} routes</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error/10 border-2 border-error/30 rounded-lg flex items-center gap-3">
          <Icon name="exclamation-circle" className="w-5 h-5 text-error flex-shrink-0" />
          <div className="flex-1">
            <p className="text-error font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-error hover:text-error/80">
            <Icon name="x-mark" className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-warning/10 border-2 border-warning/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="exclamation-triangle" className="w-5 h-5 text-warning" />
            <p className="font-semibold text-warning">Data Validation Issues:</p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-card rounded-xl shadow-sm p-2 border border-border">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-accent text-white shadow-lg transform scale-105'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Icon name={tab.icon} className="w-5 h-5" />
              <span className="font-heading">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {/* UPLOAD & ANALYSIS TAB */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Excel Upload Section */}
            <div className="bg-card rounded-xl shadow-lg p-10 border-2 border-dashed border-border">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-3 border-dashed rounded-2xl p-16 transition-all ${
                  dragOver
                    ? 'border-accent bg-accent/5 scale-[1.02]'
                    : 'border-border bg-muted/20 hover:bg-muted/30'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <div className="flex flex-col items-center gap-4">
                  {/* Large centered icon with teal background */}
                  <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mb-2">
                    <Icon name="document-text" className="w-12 h-12 text-accent" />
                  </div>
                  
                  {uploading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium text-accent">Uploading and processing...</span>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-heading font-bold text-foreground">
                        Upload Excel File
                      </h2>
                      <p className="text-base text-muted-foreground">
                        Drag & drop or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supported: .xlsx, .xls
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Icon name="exclamation-triangle" className="w-4 h-4 text-warning" />
                        <p className="text-sm font-medium text-warning">
                          Must contain all 7 required data sheets
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-6 mt-8">
                {/* Total Routes */}
                <div className="bg-background rounded-xl p-6 border border-border text-center">
                  <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    TOTAL ROUTES
                  </p>
                  <p className="text-4xl font-bold text-accent">
                    {dataStatus?.total_routes || 0}
                  </p>
                </div>

                {/* Plants */}
                <div className="bg-background rounded-xl p-6 border border-border text-center">
                  <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    PLANTS
                  </p>
                  <p className="text-4xl font-bold text-accent">
                    {dataStatus?.total_plants || 0}
                  </p>
                </div>

                {/* Periods */}
                <div className="bg-background rounded-xl p-6 border border-border text-center">
                  <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    PERIODS
                  </p>
                  <p className="text-4xl font-bold text-warning">
                    {dataStatus?.total_periods || 0}
                  </p>
                </div>

                {/* Data Sheets */}
                <div className="bg-background rounded-xl p-6 border border-border text-center">
                  <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    DATA SHEETS
                  </p>
                  <p className="text-4xl font-bold text-accent">
                    {dataStatus?.sheets?.length || 0}
                  </p>
                </div>
              </div>

              {/* View Mathematical Model Button */}
              <button
                onClick={() => setActiveTab('model')}
                disabled={!dataStatus?.loaded}
                className="w-full mt-6 px-6 py-4 bg-background hover:bg-muted/50 border-2 border-border rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Icon name="calculator" className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="font-semibold text-muted-foreground group-hover:text-accent transition-colors">
                  View Mathematical Optimization Model
                </span>
              </button>

              {dataStatus?.loaded && (
                <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="check-circle" className="w-5 h-5 text-success" />
                    <span className="font-semibold text-success">Dataset Active: {dataStatus.source}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {dataStatus.sheets.map((sheet) => (
                      <div key={sheet} className="px-3 py-2 bg-card rounded-lg text-sm font-medium text-foreground">
                        ✓ {sheet}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Route Selection */}
            {dataStatus?.loaded && (
              <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Icon name="map-pin" className="w-6 h-6 text-accent" />
                    <h2 className="text-xl font-heading font-bold text-foreground">Route Selection</h2>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-lg">
                    <Icon name="chart-bar" className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-accent">
                      Options from uploaded Excel only
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  {/* Source */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      SOURCE PLANT (IU)
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-medium focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      value={selectedSource}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      disabled={sources.length === 0}
                    >
                      <option value="">Select source...</option>
                      {sources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {sources.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground italic">{NOT_AVAILABLE}</p>
                    )}
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      DESTINATION PLANT
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-medium focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all disabled:opacity-50"
                      value={selectedDestination}
                      onChange={(e) => handleDestinationChange(e.target.value)}
                      disabled={!selectedSource || destinations.length === 0}
                    >
                      <option value="">Select destination...</option>
                      {destinations.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {selectedSource && destinations.length === 0 && (
                      <p className="mt-2 text-xs text-warning">{NOT_AVAILABLE}</p>
                    )}
                  </div>

                  {/* Transport Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      TRANSPORT MODE
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-medium focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all disabled:opacity-50"
                      value={selectedMode}
                      onChange={(e) => handleModeChange(e.target.value)}
                      disabled={!selectedDestination || modes.length === 0}
                    >
                      <option value="">Select mode...</option>
                      {modes.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name} ({m.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Period */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      TIME PERIOD
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-medium focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all disabled:opacity-50"
                      value={selectedPeriod}
                      onChange={(e) => handlePeriodChange(e.target.value)}
                      disabled={periods.length === 0}
                    >
                      <option value="">Select period...</option>
                      {periods.map((p) => (
                        <option key={p} value={p}>Period {p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Route Analytics Results */}
            {loading && (
              <div className="bg-card rounded-xl shadow-lg p-12 flex items-center justify-center border border-border">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg font-medium text-muted-foreground">Loading route data...</span>
                </div>
              </div>
            )}

            {routeData && !loading && (
              <div className="space-y-6">
                {/* Feasibility Banner */}
                {routeData.feasibility && (
                  <div className={`p-6 rounded-xl border-2 flex items-center gap-4 ${
                    routeData.feasibility.is_feasible
                      ? 'bg-success/10 border-success/30'
                      : 'bg-error/10 border-error/30'
                  }`}>
                    <Icon
                      name={routeData.feasibility.is_feasible ? 'check-circle' : 'x-circle'}
                      className={`w-8 h-8 ${
                        routeData.feasibility.is_feasible ? 'text-success' : 'text-error'
                      }`}
                    />
                    <div>
                      <p className={`text-lg font-bold ${
                        routeData.feasibility.is_feasible ? 'text-success' : 'text-error'
                      }`}>
                        {routeData.feasibility.is_feasible ? 'Solution is Feasible' : 'Infeasible Solution'}
                      </p>
                      <p className="text-sm text-foreground/80">
                        {routeData.feasibility.is_feasible
                          ? 'All constraints are satisfied'
                          : routeData.feasibility.issues?.join(', ') || 'Constraint violations detected'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Decision Variables */}
                {routeData.decision_variables && (
                  <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon name="variable" className="w-6 h-6 text-primary" />
                      </div>
                      <h2 className="text-2xl font-heading font-bold text-foreground">
                        MILP Decision Variables
                      </h2>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                      {Object.entries(routeData.decision_variables).map(([key, variable]: [string, any]) => (
                        <div key={key} className="p-5 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border">
                          <p className="font-mono text-accent font-bold text-lg mb-2">{variable.name}</p>
                          <p className="text-3xl font-bold text-foreground mb-1">
                            {variable.value?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-primary font-medium mb-3">{variable.unit}</p>
                          <p className="text-xs text-muted-foreground">{variable.description}</p>
                          {variable.formula && (
                            <p className="text-xs text-accent mt-2 font-mono">{variable.formula}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objective Function */}
                {routeData.objective_function && (
                  <div className="bg-gradient-to-br from-success/10 to-emerald/5 rounded-xl shadow-lg p-8 border-2 border-success/30">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-success/20 rounded-lg">
                        <Icon name="target" className="w-6 h-6 text-success" />
                      </div>
                      <h2 className="text-2xl font-heading font-bold text-foreground">
                        Objective Function: {routeData.objective_function.type}
                      </h2>
                    </div>
                    <div className="p-6 bg-card rounded-xl mb-6 border border-success/20">
                      <p className="font-mono text-success font-bold text-lg">
                        {routeData.objective_function.formula}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {routeData.objective_function.components?.map((comp: any, idx: number) => (
                        <div key={idx} className="p-4 bg-card rounded-lg border border-border">
                          <p className="text-sm font-semibold text-foreground mb-2">{comp.name}</p>
                          <p className="text-2xl font-bold text-success">
                            ₹{comp.value?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{comp.formula}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraints Analysis */}
                {routeData.constraints && (
                  <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-error/10 rounded-lg">
                        <Icon name="shield-exclamation" className="w-6 h-6 text-error" />
                      </div>
                      <h2 className="text-2xl font-heading font-bold text-foreground">
                        Constraints Analysis
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(routeData.constraints).map(([key, constraint]: [string, any]) => (
                        constraint && typeof constraint === 'object' && constraint.name && (
                          <div
                            key={key}
                            className={`p-5 rounded-xl border-2 ${
                              constraint.satisfied
                                ? 'bg-success/5 border-success/30'
                                : 'bg-error/5 border-error/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-foreground">{constraint.name}</p>
                              <Icon
                                name={constraint.satisfied ? 'check-circle' : 'x-circle'}
                                className={`w-5 h-5 ${
                                  constraint.satisfied ? 'text-success' : 'text-error'
                                }`}
                              />
                            </div>
                            <p className="font-mono text-sm text-muted-foreground mb-2">
                              {constraint.formula}
                            </p>
                            <div className="text-sm space-y-1 text-foreground/80">
                              <p>LHS: {constraint.lhs} | RHS: {constraint.rhs}</p>
                              {constraint.slack && (
                                <p className="text-success">Slack: {constraint.slack}</p>
                              )}
                              {constraint.utilization_pct && (
                                <p>Utilization: {constraint.utilization_pct}%</p>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Metrics */}
                {routeData.metrics && (
                  <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <Icon name="chart-bar" className="w-6 h-6 text-accent" />
                      </div>
                      <h2 className="text-2xl font-heading font-bold text-foreground">
                        Performance Metrics
                      </h2>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-5 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl">
                        <p className="text-sm font-medium text-accent mb-1">Capacity Utilization</p>
                        <p className="text-3xl font-bold text-accent">
                          {routeData.metrics.capacity_utilization_pct?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-success/10 to-emerald/5 rounded-xl">
                        <p className="text-sm font-medium text-success mb-1">Demand Fulfillment</p>
                        <p className="text-3xl font-bold text-success">
                          {routeData.metrics.demand_fulfillment_pct?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                        <p className="text-sm font-medium text-primary mb-1">Transport Efficiency</p>
                        <p className="text-3xl font-bold text-primary">
                          {routeData.metrics.transport_efficiency?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-warning/10 to-amber/5 rounded-xl">
                        <p className="text-sm font-medium text-warning mb-1">Inventory Turnover</p>
                        <p className="text-3xl font-bold text-warning">
                          {routeData.metrics.inventory_turnover_source?.toFixed(2)}x
                        </p>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    {routeData.metrics.cost_breakdown_pct && (
                      <div className="mt-6 p-5 bg-muted/30 rounded-xl">
                        <p className="text-sm font-semibold text-foreground mb-3">Cost Breakdown</p>
                        <div className="flex gap-2 h-6 rounded-lg overflow-hidden">
                          <div
                            className="bg-primary flex items-center justify-center text-xs font-bold text-white"
                            style={{ width: `${routeData.metrics.cost_breakdown_pct.production}%` }}
                          >
                            {routeData.metrics.cost_breakdown_pct.production.toFixed(0)}%
                          </div>
                          <div
                            className="bg-accent flex items-center justify-center text-xs font-bold text-white"
                            style={{ width: `${routeData.metrics.cost_breakdown_pct.transport}%` }}
                          >
                            {routeData.metrics.cost_breakdown_pct.transport.toFixed(0)}%
                          </div>
                          <div
                            className="bg-warning flex items-center justify-center text-xs font-bold text-white"
                            style={{ width: `${routeData.metrics.cost_breakdown_pct.holding}%` }}
                          >
                            {routeData.metrics.cost_breakdown_pct.holding.toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex gap-4 mt-3 text-xs">
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-primary rounded"></div> Production
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-accent rounded"></div> Transport
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-warning rounded"></div> Holding
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No Selection State */}
            {!loading && !routeData && dataStatus?.loaded && (
              <div className="bg-card rounded-xl shadow-lg p-16 text-center border border-border">
                <Icon name="cursor-arrow-rays" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Select a Route</h3>
                <p className="text-muted-foreground">
                  Choose source, destination, transport mode, and period to view complete MILP analysis
                </p>
              </div>
            )}
          </div>
        )}

        {/* MATHEMATICAL MODEL TAB */}
        {activeTab === 'model' && (
          <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon name="calculator" className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">
                  MILP Mathematical Model Formulation
                </h2>
                <p className="text-muted-foreground">
                  Complete mathematical framework for supply chain optimization
                </p>
              </div>
            </div>

            {mathModel ? (
              <div className="space-y-8">
                {/* Decision Variables */}
                {mathModel.decision_variables && (
                  <div>
                    <h3 className="text-xl font-bold text-accent mb-4 flex items-center gap-2">
                      <Icon name="variable" className="w-5 h-5" />
                      Decision Variables
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {mathModel.decision_variables.map((v: any, idx: number) => (
                        <div key={idx} className="p-5 bg-muted/30 rounded-xl border border-border">
                          <p className="font-mono text-lg font-bold text-primary mb-2">{v.symbol}</p>
                          <p className="font-semibold text-foreground mb-1">{v.name}</p>
                          <p className="text-sm text-muted-foreground mb-2">{v.description}</p>
                          <div className="flex gap-4 text-xs">
                            <span className="text-accent">Unit: {v.unit}</span>
                            <span className="text-primary">Domain: {v.domain}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objective Function */}
                {mathModel.objective && (
                  <div>
                    <h3 className="text-xl font-bold text-success mb-4 flex items-center gap-2">
                      <Icon name="target" className="w-5 h-5" />
                      Objective Function
                    </h3>
                    <div className="p-6 bg-gradient-to-br from-success/10 to-emerald/5 rounded-xl border-2 border-success/30">
                      <p className="text-sm font-semibold text-success mb-3">
                        {mathModel.objective.type}: {mathModel.objective.description}
                      </p>
                      <p className="font-mono text-lg font-bold text-success mb-4">
                        {mathModel.objective.formula}
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        {mathModel.objective.components?.map((comp: any, idx: number) => (
                          <div key={idx} className="p-4 bg-card rounded-lg border border-success/20">
                            <p className="font-semibold text-foreground text-sm mb-1">{comp.name}</p>
                            <p className="font-mono text-xs text-success">{comp.formula}</p>
                            <p className="text-xs text-muted-foreground mt-2">{comp.unit}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {mathModel.constraints && (
                  <div>
                    <h3 className="text-xl font-bold text-error mb-4 flex items-center gap-2">
                      <Icon name="shield-check" className="w-5 h-5" />
                      Constraints
                    </h3>
                    <div className="space-y-3">
                      {mathModel.constraints.map((c: any, idx: number) => (
                        <div key={idx} className="p-5 bg-muted/30 rounded-xl border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-foreground text-lg mb-2">{c.name}</p>
                              <p className="font-mono text-sm text-error mb-2">{c.formula}</p>
                              <p className="text-sm text-muted-foreground mb-1">{c.description}</p>
                              <p className="text-xs text-accent">Source: {c.source}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parameters */}
                {mathModel.parameters && (
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                      <Icon name="document-text" className="w-5 h-5" />
                      Model Parameters
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {mathModel.parameters.map((param: any, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border">
                          <p className="font-mono text-sm font-bold text-accent mb-1">{param.symbol}</p>
                          <p className="text-sm text-muted-foreground">{param.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Icon name="document-text" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">No mathematical model loaded</p>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Icon name="chart-bar" className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">
                  Advanced Analytics Dashboard
                </h2>
                <p className="text-muted-foreground">
                  Comprehensive supply chain performance metrics
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* This section can be expanded with more analytics */}
              <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
                <Icon name="chart-bar" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground mb-6">
                  Select a route in the Data Upload tab to view detailed analytics
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                >
                  Go to Data Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="database" className="w-4 h-4" />
            <span>All decisions and insights derived exclusively from uploaded dataset</span>
          </div>
          <span className="text-xs text-muted-foreground">Advanced OR Platform v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOptimizationInteractive;
