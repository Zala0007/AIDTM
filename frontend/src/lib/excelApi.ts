/**
 * API client for Excel-based Advanced Optimization
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003';

// Type definitions
export interface UploadResponse {
  success: boolean;
  message?: string;
  sheets_found?: string[];
  total_routes?: number;
  total_plants?: number;
  total_periods?: number;
  periods?: string[];
  warnings?: string[];
  errors?: string[];
}

export interface Source {
  code: string;
  name?: string;
}

export interface Destination {
  code: string;
  name?: string;
}

export interface TransportMode {
  code: string;
  name: string;
  vehicle_capacity?: number | string;
}

export interface DataCompleteness {
  logistics: boolean;
  capacity: boolean;
  demand: boolean;
  costs: boolean;
  inventory: boolean;
  constraints: boolean;
}

export interface AdvancedMetrics {
  cost_per_trip: number;
  capacity_utilization_pct: number;
  load_efficiency_pct: number;
  recommended_quantity: number;
  recommended_trips: number;
  potential_savings: number;
}

export interface RouteData {
  source: string;
  destination: string;
  mode: string;
  period: string;
  freight_cost?: number | string;
  handling_cost?: number | string;
  transport_capacity?: number | string;
  source_capacity?: number | string;
  destination_demand?: number;
  production_cost?: number | string;
  source_opening_stock?: number;
  data_completeness: DataCompleteness;
  advanced_metrics: AdvancedMetrics;
}

export interface MathematicalModel {
  success: boolean;
  model: {
    name: string;
    type: string;
    objective: {
      type: string;
      description: string;
      formula: string;
      components: Array<{
        name: string;
        formula: string;
        unit: string;
      }>;
    };
    decision_variables: Array<{
      symbol: string;
      description: string;
      unit: string;
      domain: string;
    }>;
    constraints: Array<{
      name: string;
      formula: string;
      description: string;
      scope: string;
    }>;
    indices: Array<{
      symbol: string;
      description: string;
      set: string;
    }>;
    parameters: Array<{
      symbol: string;
      description: string;
      source: string;
    }>;
  };
}

/**
 * Upload Excel file
 */
export async function uploadExcelFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

/**
 * Load default CSV data from project
 */
export async function loadDefaultData(): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE_URL}/api/load-default`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load default data');
  }

  return response.json();
}

/**
 * Get mathematical model description
 */
export async function getMathematicalModel(): Promise<MathematicalModel> {
  const response = await fetch(`${API_BASE_URL}/api/model`);

  if (!response.ok) {
    throw new Error('Failed to fetch mathematical model');
  }

  return response.json();
}

/**
 * Get list of source plants
 */
export async function getSources(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/sources`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch sources');
  }

  const data = await response.json();
  return data.sources;
}

/**
 * Get destinations for a source
 */
export async function getDestinations(source: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/destinations/${encodeURIComponent(source)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch destinations');
  }

  const data = await response.json();
  return data.destinations;
}

/**
 * Get transport modes for a route
 */
export async function getModes(source: string, destination: string): Promise<TransportMode[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/modes/${encodeURIComponent(source)}/${encodeURIComponent(destination)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch modes');
  }

  const data = await response.json();
  return data.modes;
}

/**
 * Get available time periods
 */
export async function getPeriods(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/periods`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch periods');
  }

  const data = await response.json();
  return data.periods;
}

/**
 * Get route analytics data
 */
export async function getRouteData(
  source: string,
  destination: string,
  mode: string,
  period: string
): Promise<RouteData> {
  const params = new URLSearchParams({
    source,
    destination,
    mode,
    period,
  });

  const response = await fetch(`${API_BASE_URL}/api/route?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch route data');
  }

  return response.json();
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{
  status: string;
  service: string;
  data_loaded: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return response.json();
}
