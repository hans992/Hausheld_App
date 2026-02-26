/**
 * Admin API client. Uses VITE_API_URL (e.g. http://localhost:8000) or /api proxy.
 * All requests require Authorization: Bearer <token> (admin).
 */
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("hausheld_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("hausheld_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("hausheld_token");
}

export interface MeResponse {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function getMe(): Promise<MeResponse> {
  return fetchApi<MeResponse>("/auth/me");
}

/** Demo / dev login: get JWT by email. No Authorization header. */
export async function devLogin(email: string): Promise<{ access_token: string; token_type: string; expires_in_seconds: number }> {
  const res = await fetch(`${API_BASE}/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(Array.isArray(err.detail) ? err.detail[0]?.msg ?? res.statusText : err.detail ?? res.statusText);
  }
  return res.json();
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(Array.isArray(err.detail) ? err.detail[0]?.msg ?? res.statusText : err.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Shifts
export interface Shift {
  id: number;
  worker_id: number | null;
  client_id: number;
  client_name?: string | null;
  start_time: string;
  end_time: string;
  status: string;
  tasks: string;
  check_in_at: string | null;
  check_out_at: string | null;
  signature_storage_key: string | null;
  cost: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getShifts(): Promise<Shift[]> {
  return fetchApi<Shift[]>("/shifts");
}

export interface ShiftUpdateBody {
  worker_id?: number | null;
  start_time?: string;
  end_time?: string;
  status?: string;
  tasks?: string;
}

export async function updateShift(shiftId: number, body: ShiftUpdateBody): Promise<Shift> {
  return fetchApi<Shift>(`/shifts/${shiftId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Workers
export interface Worker {
  id: number;
  name: string;
  email: string;
  role: string;
  contract_hours: number | null;
  current_location: { longitude: number; latitude: number } | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getWorkers(): Promise<Worker[]> {
  return fetchApi<Worker[]>("/workers");
}

export interface SickLeaveRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string;
}

export interface SickLeaveResponse {
  worker_id: number;
  is_available: boolean;
  shifts_marked_unassigned: number;
}

export async function setSickLeave(workerId: number, body: SickLeaveRequest): Promise<SickLeaveResponse> {
  return fetchApi<SickLeaveResponse>(`/workers/${workerId}/sick-leave`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Clients
export interface Client {
  id: number;
  name: string;
  address: string;
  insurance_provider: string;
  insurance_number: string | null;
  care_level: number;
  monthly_budget: string;
  address_location: { longitude: number; latitude: number } | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getClients(): Promise<Client[]> {
  return fetchApi<Client[]>("/clients");
}

export interface BudgetStatusResponse {
  client_id: number;
  month: string;
  monthly_budget: string;
  total_deducted: string;
  remaining_budget: string;
  deductions: { shift_id: number; date: string; duration_hours: number; cost: string }[];
  budget_alert: boolean;
}

export async function getClientBudgetStatus(clientId: number, month: string): Promise<BudgetStatusResponse> {
  return fetchApi<BudgetStatusResponse>(`/clients/${clientId}/budget-status?month=${encodeURIComponent(month)}`);
}

export async function getBudgetAlerts(month: string): Promise<BudgetStatusResponse[]> {
  return fetchApi<BudgetStatusResponse[]>(`/clients/budget-alerts?month=${encodeURIComponent(month)}`);
}

// Suggest substitutes (Admin)
export interface SubstituteSuggestion {
  worker: Worker;
  distance_meters: number;
  assigned_hours_this_week: number;
  remaining_capacity_hours: number;
}

export async function getSuggestSubstitutes(shiftId: number): Promise<SubstituteSuggestion[]> {
  return fetchApi<SubstituteSuggestion[]>(`/shifts/${shiftId}/suggest-substitutes`);
}

// Geo (heatmap)
export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { weight: number };
  }>;
}

export async function getHeatmap(): Promise<GeoJSONFeatureCollection> {
  return fetchApi<GeoJSONFeatureCollection>("/api/v1/geo/heatmap");
}

// Dashboard stats (for Map page and dashboard)
export interface DashboardSummary {
  weekly_shift_trends: { date: string; count: number }[];
  city_distribution: { name: string; value: number }[];
  budget_usage: { total_spent: number; total_allocated: number };
  total_active_workers: number;
  total_clients: number;
  monthly_revenue: number;
  top_workers_completed_shifts: { name: string; value: number }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchApi<DashboardSummary>("/api/v1/stats/dashboard-summary");
}

// Audit log
export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  target_type: string;
  target_id: number;
  details: string | null;
  created_at: string;
}

export async function getAuditLogs(params?: {
  target_type?: string;
  target_id?: number;
  user_id?: number;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  const search = new URLSearchParams();
  if (params?.target_type) search.set("target_type", params.target_type);
  if (params?.target_id != null) search.set("target_id", String(params.target_id));
  if (params?.user_id != null) search.set("user_id", String(params.user_id));
  if (params?.action) search.set("action", params.action);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString();
  return fetchApi<AuditLogEntry[]>(`/audit-logs${q ? `?${q}` : ""}`);
}

// Billing export (CSV download)
export async function downloadBillingCsv(month: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/exports/billing?month=${encodeURIComponent(month)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `billing_${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Dev only: run demo seed (requires AUTH_DEV_MODE=true and Admin). */
export async function runSeedDemo(): Promise<{ ok: boolean; message: string }> {
  return fetchApi<{ ok: boolean; message: string }>("/dev/seed-demo", { method: "POST" });
}
