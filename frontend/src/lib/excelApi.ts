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
  success: boolean;
  source: string;
  destination: string;
  mode: string;
  period: string;
  feasibility?: {
    is_feasible: boolean;
    issues: string[];
  };
  decision_variables?: {
    [key: string]: {
      name: string;
      value: number;
      unit: string;
      description: string;
      formula?: string;
    };
  };
  objective_function?: {
    type: string;
    formula: string;
    components: Array<{
      name: string;
      value: number;
      formula: string;
      calculation?: string;
      breakdown?: any;
    }>;
    total_cost: number;
    cost_per_ton: number;
  };
  mass_balance?: {
    source: {
      opening_inventory: number;
      production: number;
      inbound: number;
      outbound: number;
      demand: number;
      ending_inventory: number;
      equation: string;
    };
    destination: {
      opening_inventory: number;
      production: number;
      inbound: number;
      outbound: number;
      demand: number;
      ending_inventory: number;
      equation: string;
    };
  };
  constraints?: {
    [key: string]: {
      name: string;
      formula: string;
      lhs?: number;
      rhs?: number;
      satisfied: boolean;
      slack?: number;
      utilization_pct?: number;
      safety_stock?: number;
      current?: number;
      max_capacity?: number | string;
      vehicle_capacity?: string;
    };
  };
  strategic_constraints?: Array<{
    bound: string;
    value_type: string;
    value: number;
    transport: string;
  }>;
  metrics?: {
    [key: string]: any;
  };
  raw_data?: {
    [key: string]: any;
  };
  // Legacy fields for backward compatibility
  freight_cost?: number | string;
  handling_cost?: number | string;
  transport_capacity?: number | string;
  source_capacity?: number | string;
  destination_demand?: number;
  production_cost?: number | string;
  source_opening_stock?: number;
  data_completeness?: DataCompleteness;
  advanced_metrics?: AdvancedMetrics;
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
  // Handle both array response and object with sources key
  return Array.isArray(data) ? data : (data.sources || []);
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
  // Handle both array response and object with destinations key
  return Array.isArray(data) ? data : (data.destinations || []);
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
  // Handle both array response and object with modes key
  return Array.isArray(data) ? data : (data.modes || []);
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
  // Handle both array response and object with periods key
  return Array.isArray(data) ? data : (data.periods || []);
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
