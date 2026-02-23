/**
 * FastAPI backend client. All requests require Authorization: Bearer <token>.
 * Set NEXT_PUBLIC_API_URL in .env.local (e.g. http://localhost:8000).
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hausheld_token");
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("hausheld_token", token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("hausheld_token");
}

/** Demo / dev login: get JWT for an existing worker by email. No Authorization header. */
export async function devLogin(email: string): Promise<{ access_token: string; token_type: string; expires_in_seconds: number }> {
  const res = await fetch(`${API_URL}/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Shift {
  id: number;
  worker_id: number | null;
  client_id: number;
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

export async function getShift(id: string | number): Promise<Shift> {
  return fetchApi<Shift>(`/shifts/${id}`);
}

export async function getShiftsForToday(): Promise<Shift[]> {
  const shifts = await getShifts();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return shifts.filter((s) => {
    const start = new Date(s.start_time);
    return start >= todayStart && start < todayEnd;
  });
}

export interface CheckInPayload {
  check_in_location: { longitude: number; latitude: number };
}

export async function checkIn(shiftId: number, payload: CheckInPayload): Promise<Shift> {
  return fetchApi<Shift>(`/shifts/${shiftId}/check-in`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface CheckOutPayload {
  check_out_location: { longitude: number; latitude: number };
  signature_base64: string;
}

export async function checkOut(shiftId: number, payload: CheckOutPayload): Promise<Shift> {
  return fetchApi<Shift>(`/shifts/${shiftId}/check-out`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

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

export interface WorkerProfile {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function getMe(): Promise<WorkerProfile> {
  return fetchApi<WorkerProfile>("/auth/me");
}
