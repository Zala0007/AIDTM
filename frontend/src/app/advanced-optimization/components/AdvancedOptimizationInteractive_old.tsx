 // DISABLED - This file has been superseded by AdvancedOptimizationInteractive.tsx
// Renamed to .backup to exclude from compilation
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Icon from '@/components/ui/AppIcon';
import * as ExcelAPI from '@/lib/excelApi';

// Types
type AdvancedMetrics = ExcelAPI.RouteData['advanced_metrics'];
type RouteData = ExcelAPI.RouteData;
type TransportMode = ExcelAPI.TransportMode;
type MathModel = ExcelAPI.MathematicalModel['model'];

interface DataStatus {
  loaded: boolean;
  source: string;
  sheets: string[];
  total_routes: number;
  total_plants: number;
  periods: string[];
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
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

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
      setError('Failed to connect to backend. Make sure the server is running.');
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
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          setValidationErrors(data.errors);
        } else {
          setError('Failed to parse file.');
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
      setError('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([]);
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getTransportIcon = (mode: string) => {
    const modeUpper = mode.toUpperCase();
    if (modeUpper.includes('ROAD') || modeUpper === 'T1') return 'truck';
    if (modeUpper.includes('RAIL') || modeUpper === 'T2') return 'building-office-2';
    if (modeUpper.includes('SEA') || modeUpper === 'T3') return 'archive-box';
    return 'truck';
  };

  const formatValue = (value: any, suffix: string = '') => {
    if (value === NOT_AVAILABLE || value === null || value === undefined) {
      return <span className="text-gray-400 italic text-sm">{NOT_AVAILABLE}</span>;
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
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Image src="/logo.png" alt="ClinkerFlow" width={40} height={40} className="rounded-lg" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Advanced OR Platform</h1>
        </div>
        <p className="text-muted-foreground">
          Excel-driven MILP optimization with comprehensive route analytics and mathematical modeling
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <Icon name="exclamation-circle" className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 text-sm underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="exclamation-triangle" className="w-5 h-5 text-red-500" />
            <p className="font-semibold text-red-800">Data Validation Issues:</p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-accent text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon name={tab.icon} className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="space-y-6">{/* Upload content will go here */}</div>
        )}

        {/* MODEL TAB */}
        {activeTab === 'model' && (
          <div className="bg-white rounded-lg shadow-lg p-8">{/* Model content will go here */}</div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-lg p-8">{/* Analytics content will go here */}</div>
        )}
      </div>
    </div>
  );
};

export default AdvancedOptimizationInteractive;
