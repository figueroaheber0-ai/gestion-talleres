import type { UserRole } from "@/context/AuthContext";

export interface SessionUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  tenantId?: string;
  sessionId?: string;
}

interface SessionResponse {
  token: string;
  user: SessionUser;
  expiresAt: number;
}

export interface TenantChoice {
  tenantId: string;
  tenantName: string;
  role: UserRole;
  name: string;
  email: string;
}

export type LoginResponse =
  | SessionResponse
  | {
      requiresTenantSelection: true;
      accounts: TenantChoice[];
    };

export interface DashboardResponse {
  stats: {
    appointmentsToday: number;
    activeOrders: number;
    vehiclesInWorkshop: number;
  };
  recentAppointments: Array<{
    id: string;
    vehicleLabel: string;
    plate: string;
    time: string;
    reason: string;
    status: string;
  }>;
}

export interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicles: Array<{
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number | null;
    workOrders: Array<{
      id: string;
      createdAt: string;
    }>;
  }>;
}

export interface VehicleHistoryResponse {
  id: string;
  tenantId: string;
  workshopName: string;
  workshops: string[];
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  profile: {
    alias: string | null;
    color: string | null;
    notes: string | null;
    insuranceProvider: string | null;
    policyNumber: string | null;
  };
  workOrders: Array<{
    id: string;
    tenantId: string;
    workshopName: string;
    status: string;
    diagnostic: string | null;
    laborCost: number;
    totalCost: number;
    createdAt: string;
    recommendedNextRevisionDate: string | null;
    recommendedNextRevisionNote: string | null;
    mechanic: { name: string } | null;
    appointment: {
      id: string;
      date: string;
      time: string;
      reason: string;
      status: string;
    } | null;
    parts: Array<{
      quantity: number;
      unitPrice: number;
      internalCost: number;
      providedByClient: boolean;
      item: {
        name: string;
      };
    }>;
    updates: Array<{
      id: string;
      title: string;
      message: string;
      createdAt: string;
    }>;
  }>;
}

export interface PortalResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  vehicles: VehicleHistoryResponse[];
}

export interface AppointmentBoardColumn {
  id: string;
  title: string;
  count: number;
  color: string;
  dot: string;
  items: Array<{
    id: string;
    itemType: "appointment" | "workOrder";
    vehicleId: string;
    plate: string;
    model: string;
    client: string;
    reason: string;
    assigned: string;
    urgent: boolean;
    scheduledFor: string;
    time: string | null;
  }>;
}

export type BoardColumnId = "agendados" | "diagnostico" | "reparacion" | "listos";

export interface WorkOrderRow {
  id: string;
  vehicleId: string;
  vehiculo: string;
  patente: string;
  cliente: string;
  mecanico: string;
  motivo: string;
  estado: string;
  prioridad: string;
  fechaIngreso: string;
  estimado: number;
  internalCost: number;
  margin: number;
}

export interface FinanceSummaryResponse {
  period: "dia" | "semana" | "mes" | "anio";
  summary: {
    ingresos: number;
    costos: number;
    ganancia: number;
  };
  byMechanic: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  timeline: Array<{
    name: string;
    ingresos: number;
    costos: number;
    ganancia: number;
  }>;
}

export interface MechanicOption {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface WorkOrderDetailResponse {
  id: string;
  status: string;
  diagnostic: string | null;
  laborCost: number;
  totalCost: number;
  recommendedNextRevisionDate: string | null;
  recommendedNextRevisionNote: string | null;
  mechanicId: string | null;
  mechanicName: string | null;
  parts: Array<{
    itemId: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    internalCost: number;
    providedByClient: boolean;
  }>;
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number | null;
  };
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  appointment: {
    id: string;
    date: string;
    time: string;
    reason: string;
    status: string;
  } | null;
  updates: Array<{
    id: string;
    title: string;
    message: string;
    visibility: string;
    createdAt: string;
  }>;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  stockQuantity: number;
  minAlert: number;
  price: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface StaffInvite {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  tenantName: string;
  invitedByName: string;
}

export interface SuperadminTenant {
  id: string;
  name: string;
  plan: string;
  effectivePlan: string;
  effectivePlanLabel: string;
  billingMode: "catalog" | "custom";
  billingCycle: "monthly" | "semiannual" | "annual";
  status: string;
  contractStatus: "active" | "expiring" | "expired" | "suspended";
  warningLevel: "normal" | "30d" | "15d" | "7d" | "expired";
  moderationNote: string | null;
  maxCapacity: number;
  createdAt: string;
  planStartAt: string;
  planEndsAt: string;
  nextRenewalAt: string;
  autoRenew: boolean;
  remainingDays: number;
  effectiveMonthlyPrice: number;
  owner: string;
  ownerEmail: string;
  employees: number;
  totalUsers: number;
  activeOrders: number;
  monthlyRevenue: number;
  customPlan: {
    enabled: boolean;
    name: string;
    monthlyPrice: number;
    maxUsers: number;
    maxWorkOrders: number | null;
    features: string[];
  } | null;
}

export interface SuperadminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface SuperadminTestAccount {
  role: string;
  name: string;
  email: string;
  password: string;
  scope: string;
  notes: string;
}

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
  maxUsers: number;
  maxWorkOrders: number | null;
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformFinanceSummary {
  headline: {
    activeTenants: number;
    suspendedTenants: number;
    mrr: number;
    projectedArr: number;
    processedVolume: number;
    arpa: number;
    takeRate: number;
    customPlans: number;
  };
  descriptions: {
    activeTenants: string;
    suspendedTenants: string;
    mrr: string;
    projectedArr: string;
    processedVolume: string;
    arpa: string;
    takeRate: string;
    customPlans: string;
  };
  expiringSummary: {
    dueIn30Days: number;
    dueIn15Days: number;
    dueIn7Days: number;
    expired: number;
    atRiskMrr: number;
  };
  byPlan: Array<{
    code: string;
    name: string;
    monthlyPrice: number;
    tenants: number;
    activeTenants: number;
    mrr: number;
  }>;
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    plan: string;
    planLabel: string;
    billingMode: "catalog" | "custom";
    status: string;
    users: number;
    activeOrders: number;
    mrrContribution: number;
    workshopBillingVolume: number;
    utilization: number;
  }>;
  charts: {
    byPlan: Array<{
      name: string;
      code: string;
      tenants: number;
      mrr: number;
      color: string;
    }>;
    byCycle: Array<{
      name: string;
      cycle: "monthly" | "semiannual" | "annual";
      tenants: number;
      color: string;
    }>;
    expiringBuckets: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  };
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

const STAFF_TOKEN_KEY = "81cc_session_token";
export const CLIENT_TOKEN_KEY = "81cc_client_session_token";

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    console.error(`[API Error] ${response.status} ${response.statusText}`, body);
    throw new Error(body?.message ?? "No se pudo completar la solicitud.");
  }

  return body as T;
}

async function authorizedGet<T>(path: string, token: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return parseResponse<T>(response);
  } catch (error) {
    console.error(`[Fetch GET Error] ${url}:`, error);
    throw error;
  }
}

async function authorizedPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    return parseResponse<T>(response);
  } catch (error) {
    console.error(`[Fetch POST Error] ${url}:`, error);
    throw error;
  }
}

export function getStoredStaffToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export function getStoredClientToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLIENT_TOKEN_KEY);
}

export function setStoredClientToken(token: string) {
  localStorage.setItem(CLIENT_TOKEN_KEY, token);
}

export function clearStoredClientToken() {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}

export async function loginWithCredentials(email: string, password: string, tenantId?: string) {
  const url = `${API_BASE_URL}/auth/login`;
  console.log(`[Auth API] Intentando login en: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, tenantId }),
    });

    return parseResponse<LoginResponse>(response);
  } catch (error) {
    console.error(`[Auth API Error] Fallo al conectar con ${url}:`, error);
    throw error;
  }
}

export async function fetchSession(token: string) {
  return authorizedGet<{ user: SessionUser }>("/auth/session", token);
}

export async function fetchStaffMembers(token: string) {
  return authorizedGet<StaffMember[]>("/auth/staff", token);
}

export async function fetchStaffInvites(token: string) {
  return authorizedGet<StaffInvite[]>("/auth/staff/invites", token);
}

export async function createStaffInvite(
  token: string,
  input: { name: string; email: string; role: "employee" | "superadmin" },
) {
  return authorizedPost<{ ok: boolean; inviteToken: string; expiresAt: number }>(
    "/auth/staff/invites",
    token,
    input,
  );
}

export async function previewStaffInvite(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/staff/invites/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  return parseResponse<StaffInvite>(response);
}

export async function acceptStaffInvite(input: { token: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/staff/invites/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<{ ok: boolean; tenantName: string }>(response);
}

export async function fetchSuperadminTenants(token: string) {
  return authorizedGet<SuperadminTenant[]>("/auth/superadmin/tenants", token);
}

export async function fetchSuperadminUsers(token: string) {
  return authorizedGet<SuperadminUser[]>("/auth/superadmin/users", token);
}

export async function fetchSuperadminTestAccounts(token: string) {
  return authorizedGet<SuperadminTestAccount[]>("/auth/superadmin/test-accounts", token);
}

export async function fetchSuperadminPlans(token: string) {
  return authorizedGet<PlatformPlan[]>("/auth/superadmin/plans", token);
}

export async function fetchSuperadminFinances(token: string) {
  return authorizedGet<PlatformFinanceSummary>("/auth/superadmin/finances", token);
}

export async function upsertPlatformPlan(
  token: string,
  input: {
    code: string;
    name: string;
    monthlyPrice: number;
    maxUsers: number;
    maxWorkOrders?: number | null;
    features?: string[];
    active?: boolean;
  },
) {
  return authorizedPost<PlatformPlan[]>("/auth/superadmin/plans", token, input);
}

export async function moderateTenant(
  token: string,
  tenantId: string,
  input: {
    status?: "active" | "suspended";
    planOverride?: string | null;
    moderationNote?: string | null;
    maxCapacity?: number;
    billingCycle?: "monthly" | "semiannual" | "annual";
    planStartAt?: string;
    planEndsAt?: string;
    nextRenewalAt?: string;
    autoRenew?: boolean;
    effectiveMonthlyPrice?: number | null;
    customPlan?: {
      enabled?: boolean;
      name?: string;
      monthlyPrice?: number;
      maxUsers?: number;
      maxWorkOrders?: number | null;
      features?: string[];
    } | null;
  },
) {
  return authorizedPost<SuperadminTenant[]>(
    `/auth/superadmin/tenants/${tenantId}/moderate`,
    token,
    input,
  );
}

export async function registerOwner(input: {
  workshopName: string;
  name: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/register-owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<{ tenantId: string }>(response);
}

export async function registerClient(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/register-client`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<{ ok: boolean }>(response);
}

export async function loginClient(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/client/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<SessionResponse>(response);
}

export async function fetchDashboardSummary(token: string) {
  return authorizedGet<DashboardResponse>("/dashboard/summary", token);
}

export async function fetchClients(token: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return authorizedGet<ClientRow[]>(`/clients${query}`, token);
}

export async function createIntake(
  token: string,
  input: {
    clientName: string;
    phone?: string;
    email?: string;
    plate: string;
    brand: string;
    model: string;
    year?: number;
    reason: string;
    date: string;
    time: string;
  },
) {
  return authorizedPost<{ appointmentId: string; vehicleId: string; clientId: string }>(
    "/clients/intake",
    token,
    input,
  );
}

export async function fetchVehicleHistory(token: string, vehicleId: string) {
  return authorizedGet<VehicleHistoryResponse>(`/vehicles/${vehicleId}/history`, token);
}

export async function fetchSessions(token: string) {
  return authorizedGet<
    Array<{
      id: string;
      actorType: string;
      role: string;
      email: string;
      createdAt: string;
      lastSeenAt: string;
      active: boolean;
    }>
  >("/sessions", token);
}

export async function fetchClientPortal(token: string) {
  return authorizedGet<PortalResponse>("/client-portal/me", token);
}

export async function addClientPortalVehicle(
  token: string,
  input: {
    plate: string;
    brand: string;
    model: string;
    year?: number;
  },
) {
  return authorizedPost<{ ok: boolean; vehicleId: string }>("/client-portal/vehicles", token, input);
}

export async function updateClientPortalVehicleProfile(
  token: string,
  vehicleId: string,
  input: {
    alias?: string | null;
    color?: string | null;
    notes?: string | null;
    insuranceProvider?: string | null;
    policyNumber?: string | null;
  },
) {
  return authorizedPost<{ ok: boolean; vehicleId: string }>(
    `/client-portal/vehicles/${vehicleId}/profile`,
    token,
    input,
  );
}

export async function fetchAppointmentsBoard(token: string) {
  return authorizedGet<AppointmentBoardColumn[]>("/appointments/board", token);
}

export async function moveBoardItem(
  token: string,
  input: {
    itemId: string;
    sourceColumn: BoardColumnId;
    targetColumn: Exclude<BoardColumnId, "agendados">;
  },
) {
  return authorizedPost<{ ok: boolean; workOrderId: string }>(
    "/appointments/board/move",
    token,
    input,
  );
}

export async function fetchWorkOrders(token: string) {
  return authorizedGet<WorkOrderRow[]>("/work-orders", token);
}

export async function fetchMechanics(token: string) {
  return authorizedGet<MechanicOption[]>("/staff/mechanics", token);
}

export async function fetchWorkOrderDetail(token: string, workOrderId: string) {
  return authorizedGet<WorkOrderDetailResponse>(`/work-orders/${workOrderId}`, token);
}

export async function updateWorkOrder(
  token: string,
  workOrderId: string,
  input: {
    diagnostic?: string;
    laborCost?: number;
    totalCost?: number;
    recommendedNextRevisionDate?: string | null;
    recommendedNextRevisionNote?: string | null;
    mechanicId?: string | null;
    clientUpdateTitle?: string;
    clientUpdateMessage?: string;
  },
) {
  return authorizedPost<WorkOrderDetailResponse>(
    `/work-orders/${workOrderId}/update`,
    token,
    input,
  );
}

export async function fetchInventoryItems(token: string) {
  return authorizedGet<InventoryItem[]>("/inventory/items", token);
}

export async function createInventoryItem(
  token: string,
  input: {
    name: string;
    sku?: string;
    stockQuantity?: number;
    minAlert?: number;
    price?: number;
  },
) {
  return authorizedPost<InventoryItem>("/inventory/items", token, input);
}

export async function addPartToWorkOrder(
  token: string,
  workOrderId: string,
  input: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    internalCost: number;
    providedByClient?: boolean;
  },
) {
  return authorizedPost<WorkOrderDetailResponse>(
    `/work-orders/${workOrderId}/parts`,
    token,
    input,
  );
}

export async function fetchFinanceSummary(
  token: string,
  period: "dia" | "semana" | "mes" | "anio",
) {
  return authorizedGet<FinanceSummaryResponse>(
    `/finances/summary?period=${encodeURIComponent(period)}`,
    token,
  );
}
