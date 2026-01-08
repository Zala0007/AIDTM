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

function getClientBaseUrl() {
  // Default to same-origin proxy routes under `/api/*` to avoid CORS.
  // If you *really* want the browser to call the backend directly, set:
  // NEXT_PUBLIC_OPTIMIZER_API_USE_PROXY=false
  const useProxy = (process.env.NEXT_PUBLIC_OPTIMIZER_API_USE_PROXY ?? 'true') !== 'false';
  if (useProxy) return '';
  return process.env.NEXT_PUBLIC_OPTIMIZER_API_BASE_URL || '';
}

export async function fetchInitialData(params: {
  scenario?: string;
  T?: number;
  limit_plants?: number;
  limit_routes?: number;
  seed?: number;
} = {}): Promise<InitialDataResponse> {
  const baseUrl = getClientBaseUrl();

  const search = new URLSearchParams();
  if (params.scenario) search.set('scenario', params.scenario);
  if (typeof params.T === 'number') search.set('T', String(params.T));
  if (typeof params.limit_plants === 'number') search.set('limit_plants', String(params.limit_plants));
  if (typeof params.limit_routes === 'number') search.set('limit_routes', String(params.limit_routes));
  if (typeof params.seed === 'number') search.set('seed', String(params.seed));

  const url = baseUrl
    ? `${baseUrl}/initial-data${search.toString() ? `?${search.toString()}` : ''}`
    : `/api/initial-data${search.toString() ? `?${search.toString()}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Initial-data request failed (network error). URL: ${url}. ${message}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Initial-data request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  const raw = await res.json();

  // FastAPI responses are wrapped as { success, data }. Unwrap when present to
  // keep callers working with InitialDataResponse directly. Fallback to raw
  // for legacy/unwrapped responses.
  if (raw && typeof raw === 'object' && 'success' in raw) {
    const payload = raw as { success?: boolean; data?: unknown; error?: unknown };
    if (payload.success && payload.data) {
      return payload.data as InitialDataResponse;
    }
    const errMsg = (payload.error as { message?: string } | undefined)?.message || 'Initial-data request failed';
    throw new Error(errMsg);
  }

  return raw as InitialDataResponse;
}

export async function optimizeNetwork(payload: OptimizationRequest): Promise<OptimizationResponse> {
  const baseUrl = getClientBaseUrl();

  const url = baseUrl ? `${baseUrl}/optimize` : '/api/optimize';

  let res: Response;
  try {
    res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Optimize request failed (network error). URL: ${url}. ${message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Optimize request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  return (await res.json()) as OptimizationResponse;
}

export async function optimizeWithConstraintsUpload(params: {
  file: File;
  scenario?: string;
  T?: number;
  limit_plants?: number;
  limit_routes?: number;
  seed?: number;
}): Promise<OptimizationResponse> {
  const baseUrl = getClientBaseUrl();

  const search = new URLSearchParams();
  if (params.scenario) search.set('scenario', params.scenario);
  if (typeof params.T === 'number') search.set('T', String(params.T));
  if (typeof params.limit_plants === 'number') search.set('limit_plants', String(params.limit_plants));
  if (typeof params.limit_routes === 'number') search.set('limit_routes', String(params.limit_routes));
  if (typeof params.seed === 'number') search.set('seed', String(params.seed));

  const endpoint = `/optimize-with-constraints/upload${search.toString() ? `?${search.toString()}` : ''}`;
  const url = baseUrl ? `${baseUrl}${endpoint}` : `/api${endpoint}`;

  const form = new FormData();
  form.append('constraints_file', params.file, params.file.name);

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', body: form });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Optimize-with-constraints upload failed (network error). URL: ${url}. ${message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Optimize-with-constraints failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  return (await res.json()) as OptimizationResponse;
}

export async function fetchSustainabilityData(period: string = 'monthly'): Promise<SustainabilityDataResponse> {
  const baseUrl = getClientBaseUrl();

  const url = baseUrl
    ? `${baseUrl}/sustainability-data?period=${encodeURIComponent(period)}`
    : `/api/sustainability-data?period=${encodeURIComponent(period)}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Sustainability-data request failed (network error). URL: ${url}. ${message}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sustainability-data request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  return (await res.json()) as SustainabilityDataResponse;
}
