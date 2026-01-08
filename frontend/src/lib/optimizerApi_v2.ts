/**
 * Production-ready API client with standardized error handling,
 * response validation, and logging.
 */

// Types
export type PlantType = 'IU' | 'GU';

export interface Plant {
  id: string;
  name?: string;
  type: PlantType;
  initial_inventory: number;
  max_capacity: number;
  safety_stock: number;
  holding_cost?: number;
  production_cost?: number;
  max_production_per_period?: number;
}

export interface RouteMode {
  mode: string;
  unit_cost: number;
  capacity_per_trip: number;
}

export interface TransportationRoute {
  id: string;
  origin_id: string;
  destination_id: string;
  minimum_shipment_batch_quantity: number;
  modes: RouteMode[];
}

export interface OptimizationRequest {
  T?: number;
  plants: Plant[];
  routes: TransportationRoute[];
  demand?: Record<string, number[]>;
}

export interface ScheduledTrip {
  period: number;
  route_id: string;
  origin_id: string;
  destination_id: string;
  mode: string;
  num_trips: number;
  quantity_shipped: number;
}

export interface OptimizationResponse {
  status: 'Optimal' | 'Infeasible' | 'Unbounded' | 'Not Solved' | 'Error';
  total_cost?: number | null;
  scheduled_trips: ScheduledTrip[];
  message?: string | null;
}

export interface InitialDataResponse {
  T: number;
  scenario: string;
  plants: Plant[];
  routes: TransportationRoute[];
  demand: Record<string, number[]>;
  limits?: { plants: number; routes: number };
}

export interface TransportDataPoint {
  id: string;
  mode: 'rail' | 'road' | 'multimodal';
  distance: number;
  tonnage: number;
  co2PerTonKm: number;
  totalEmissions: number;
  cost: number;
  carbonIntensity: number;
}

export interface SustainabilityDataResponse {
  period: string;
  data: TransportDataPoint[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: number;
    details?: unknown;
  };
}

// Error Classes
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Configuration
function getClientBaseUrl(): string {
  const useProxy = (process.env.NEXT_PUBLIC_OPTIMIZER_API_USE_PROXY ?? 'true') !== 'false';
  if (useProxy) return '';
  return process.env.NEXT_PUBLIC_OPTIMIZER_API_BASE_URL || '';
}

function getApiUrl(endpoint: string): string {
  const baseUrl = getClientBaseUrl();
  return baseUrl ? `${baseUrl}${endpoint}` : `/api${endpoint}`;
}

// Logger (development only)
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(`[API] ${message}`, data || '');
    }
  },
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(`[API Error] ${message}`, error || '');
    }
  },
  warn: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.warn(`[API Warning] ${message}`, data || '');
    }
  },
};

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    logger.info(`Request: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Parse response
    const contentType = response.headers.get('content-type') || '';
    let responseData: unknown;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { text };
    }

    // Handle error responses
    if (!response.ok) {
      const apiResponse = responseData as APIResponse<unknown>;
      
      const errorMessage = apiResponse.error?.message || response.statusText || 'Request failed';
      const errorDetails = apiResponse.error?.details;

      logger.error(`Response Error: ${response.status}`, { message: errorMessage, details: errorDetails });

      throw new APIError(errorMessage, response.status, errorDetails);
    }

    // Handle success response
    const apiResponse = responseData as APIResponse<T>;
    
    // If response has success field, unwrap data
    if ('success' in apiResponse && apiResponse.success && 'data' in apiResponse) {
      logger.info(`Response: Success`, apiResponse.data);
      return apiResponse.data as T;
    }

    // Legacy format without success wrapper
    logger.info(`Response: Success (legacy format)`);
    return responseData as T;

  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new NetworkError('Network request failed. Please check your connection.', error);
      logger.error('Network Error', networkError);
      throw networkError;
    }

    logger.error('Unexpected Error', error);
    throw new APIError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500,
      error
    );
  }
}

// API Functions
export async function fetchInitialData(params: {
  scenario?: string;
  T?: number;
  limit_plants?: number;
  limit_routes?: number;
  seed?: number;
} = {}): Promise<InitialDataResponse> {
  const searchParams = new URLSearchParams();
  if (params.scenario) searchParams.set('scenario', params.scenario);
  if (typeof params.T === 'number') searchParams.set('T', String(params.T));
  if (typeof params.limit_plants === 'number') searchParams.set('limit_plants', String(params.limit_plants));
  if (typeof params.limit_routes === 'number') searchParams.set('limit_routes', String(params.limit_routes));
  if (typeof params.seed === 'number') searchParams.set('seed', String(params.seed));

  const queryString = searchParams.toString();
  const url = getApiUrl(`/initial-data${queryString ? `?${queryString}` : ''}`);

  return fetchAPI<InitialDataResponse>(url, { method: 'GET' });
}

export async function optimizeNetwork(payload: OptimizationRequest): Promise<OptimizationResponse> {
  const url = getApiUrl('/optimize');

  return fetchAPI<OptimizationResponse>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSustainabilityData(period: string = 'monthly'): Promise<SustainabilityDataResponse> {
  const url = getApiUrl(`/sustainability-data?period=${encodeURIComponent(period)}`);

  return fetchAPI<SustainabilityDataResponse>(url, { method: 'GET' });
}

// Export logger for component use (development only)
export { logger };
