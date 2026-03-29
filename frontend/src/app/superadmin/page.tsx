"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import {
  fetchSuperadminFinances,
  fetchSuperadminPlans,
  fetchSuperadminTenants,
  fetchSuperadminTestAccounts,
  fetchSuperadminUsers,
  getStoredStaffToken,
  moderateTenant,
  upsertPlatformPlan,
  type PlatformFinanceSummary,
  type PlatformPlan,
  type SuperadminTenant,
  type SuperadminTestAccount,
  type SuperadminUser,
} from "@/lib/auth-api";

type TenantStatus = "active" | "suspended";
type BillingCycle = "monthly" | "semiannual" | "annual";

const inputClassName =
  "mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15";

const tooltipStyle = {
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "#e2e8f0",
};

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const didInit = useRef(false);

  const [tenants, setTenants] = useState<SuperadminTenant[]>([]);
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [testAccounts, setTestAccounts] = useState<SuperadminTestAccount[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [finances, setFinances] = useState<PlatformFinanceSummary | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<SuperadminTenant | null>(null);

  const [status, setStatus] = useState<TenantStatus>("active");
  const [planOverride, setPlanOverride] = useState("starter");
  const [userLimit, setUserLimit] = useState("8");
  const [moderationNote, setModerationNote] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [planStartAt, setPlanStartAt] = useState("");
  const [planEndsAt, setPlanEndsAt] = useState("");
  const [nextRenewalAt, setNextRenewalAt] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [effectiveMonthlyPrice, setEffectiveMonthlyPrice] = useState("0");

  const [planForm, setPlanForm] = useState({
    code: "starter",
    name: "",
    monthlyPrice: "29",
    maxUsers: "4",
    maxWorkOrders: "30",
    features: "",
    active: true,
  });

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [tenantFilter, setTenantFilter] = useState("todos");
  const [error, setError] = useState("");
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (user.role !== "superadmin") router.replace("/");
  }, [router, user]);

  const loadAll = useCallback(async (token: string, initialize = false, keepTenantId?: string) => {
    try {
      setError("");
      const [tenantRows, userRows, testAccountRows, planRows, financeRows] = await Promise.all([
        fetchSuperadminTenants(token),
        fetchSuperadminUsers(token),
        fetchSuperadminTestAccounts(token),
        fetchSuperadminPlans(token),
        fetchSuperadminFinances(token),
      ]);

      setTenants(tenantRows);
      setUsers(userRows);
      setTestAccounts(testAccountRows);
      setPlans(planRows);
      setFinances(financeRows);

      const nextTenant =
        tenantRows.find((tenant) => tenant.id === keepTenantId) ??
        tenantRows[0] ??
        null;

      if (nextTenant) {
        hydrateTenant(nextTenant);
      }

      if (initialize && planRows[0]) {
        hydratePlan(planRows[0]);
        didInit.current = true;
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel de 81cc.");
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "superadmin") return;
    const token = getStoredStaffToken();
    if (!token) return;
    void loadAll(token, !didInit.current);
  }, [loadAll, user]);

  const hydrateTenant = (tenant: SuperadminTenant) => {
    setSelectedTenant(tenant);
    setStatus(tenant.status as TenantStatus);
    setPlanOverride(tenant.effectivePlan || tenant.plan);
    setUserLimit(String(tenant.maxCapacity));
    setModerationNote(tenant.moderationNote ?? "");
    setBillingCycle(tenant.billingCycle);
    setPlanStartAt(toInputDate(tenant.planStartAt));
    setPlanEndsAt(toInputDate(tenant.planEndsAt));
    setNextRenewalAt(toInputDate(tenant.nextRenewalAt));
    setAutoRenew(tenant.autoRenew);
    setEffectiveMonthlyPrice(String(tenant.effectiveMonthlyPrice));
  };

  const hydratePlan = (plan: PlatformPlan) => {
    setPlanForm({
      code: plan.code,
      name: plan.name,
      monthlyPrice: String(plan.monthlyPrice),
      maxUsers: String(plan.maxUsers),
      maxWorkOrders: plan.maxWorkOrders != null ? String(plan.maxWorkOrders) : "",
      features: plan.features.join(", "),
      active: plan.active,
    });
  };

  const saveTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token || !selectedTenant) return;
    try {
      setSavingTenant(true);
      setError("");
      await moderateTenant(token, selectedTenant.id, {
        status,
        planOverride,
        moderationNote: moderationNote.trim() || null,
        maxCapacity: Number(userLimit),
        billingCycle,
        planStartAt,
        planEndsAt,
        nextRenewalAt,
        autoRenew,
        effectiveMonthlyPrice: Number(effectiveMonthlyPrice),
      });
      await loadAll(token, false, selectedTenant.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la configuración.");
    } finally {
      setSavingTenant(false);
    }
  };

  const savePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token) return;
    try {
      setSavingPlan(true);
      setError("");
      const rows = await upsertPlatformPlan(token, {
        code: planForm.code.trim().toLowerCase(),
        name: planForm.name.trim(),
        monthlyPrice: Number(planForm.monthlyPrice),
        maxUsers: Number(planForm.maxUsers),
        maxWorkOrders: planForm.maxWorkOrders ? Number(planForm.maxWorkOrders) : null,
        features: planForm.features.split(",").map((item) => item.trim()).filter(Boolean),
        active: planForm.active,
      });
      setPlans(rows);
      const next = rows.find((item) => item.code === planForm.code.trim().toLowerCase());
      if (next) hydratePlan(next);
      setFinances(await fetchSuperadminFinances(token));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.name.toLowerCase().includes(search) ||
        entry.email.toLowerCase().includes(search) ||
        entry.tenantName.toLowerCase().includes(search);
      return (
        matchesSearch &&
        (roleFilter === "todos" || entry.role === roleFilter) &&
        (tenantFilter === "todos" || entry.tenantId === tenantFilter)
      );
    });
  }, [roleFilter, tenantFilter, userSearch, users]);

  if (!user || user.role !== "superadmin") return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_18%),radial-gradient(circle_at_20%_78%,rgba(245,158,11,0.14),transparent_20%),radial-gradient(circle_at_92%_20%,rgba(168,85,247,0.12),transparent_16%),linear-gradient(180deg,#07111f_0%,#0b1424_48%,#08111c_100%)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">81<span className="text-amber-400">cc</span></div>
            <p className="text-sm text-slate-400">Panel de administración de 81cc</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/laboratorio")} className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100">
              Abrir laboratorio
            </button>
            <button onClick={() => { logout(); router.push("/login"); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        {error ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Talleres activos" value={finances?.headline.activeTenants ?? 0} description={finances?.descriptions.activeTenants ?? ""} tone="sky" />
          <KpiCard label="Suspendidos" value={finances?.headline.suspendedTenants ?? 0} description={finances?.descriptions.suspendedTenants ?? ""} tone="rose" />
          <KpiCard label="MRR" value={`$${(finances?.headline.mrr ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.mrr ?? ""} tone="amber" />
          <KpiCard label="ARPA" value={`$${Math.round(finances?.headline.arpa ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.arpa ?? ""} tone="violet" />
          <KpiCard label="ARR proyectado" value={`$${(finances?.headline.projectedArr ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.projectedArr ?? ""} tone="sky" />
          <KpiCard label="Take rate" value={`${(finances?.headline.takeRate ?? 0).toFixed(1).replace(".", ",")}%`} description={finances?.descriptions.takeRate ?? ""} tone="emerald" />
          <KpiCard label="Volumen procesado" value={`$${(finances?.headline.processedVolume ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.processedVolume ?? ""} tone="amber" />
          <KpiCard label="Planes custom" value={finances?.headline.customPlans ?? 0} description={finances?.descriptions.customPlans ?? ""} tone="violet" />
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <AlertCard label="Vencen en 30 días" value={finances?.expiringSummary.dueIn30Days ?? 0} tone="amber" />
          <AlertCard label="Vencen en 15 días" value={finances?.expiringSummary.dueIn15Days ?? 0} tone="orange" />
          <AlertCard label="Vencen en 7 días" value={finances?.expiringSummary.dueIn7Days ?? 0} tone="rose" />
          <AlertCard label="MRR en riesgo" value={`$${(finances?.expiringSummary.atRiskMrr ?? 0).toLocaleString("es-AR")}`} tone="violet" />
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Mapa de talleres" subtitle="Contratos, ciclos y alertas">
            <div className="grid gap-4">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => hydrateTenant(tenant)}
                  className={`rounded-[1.4rem] border p-4 text-left transition ${
                    selectedTenant?.id === tenant.id ? "border-amber-400/35 bg-white/[0.06]" : "border-white/8 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{tenant.name}</p>
                      <p className="text-sm text-slate-400">{tenant.ownerEmail}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={tenant.status} />
                      <WarningBadge level={tenant.warningLevel} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MiniMetric label="Plan" value={tenant.effectivePlanLabel} />
                    <MiniMetric label="Ciclo" value={billingLabel(tenant.billingCycle)} />
                    <MiniMetric label="Restan" value={remainingLabel(tenant.remainingDays)} />
                    <MiniMetric label="Precio" value={`$${tenant.effectiveMonthlyPrice.toLocaleString("es-AR")}`} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Vence {formatDate(tenant.planEndsAt)}</span>
                    <span>Renueva {formatDate(tenant.nextRenewalAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Configuración contractual" subtitle="Edición manual por taller">
            {selectedTenant ? (
              <form onSubmit={saveTenant} className="space-y-4">
                <ContractOverview tenant={selectedTenant} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Estado">
                    <select value={status} onChange={(event) => setStatus(event.target.value as TenantStatus)} className={inputClassName}>
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </Field>
                  <Field label="Plan base del catálogo">
                    <select value={planOverride} onChange={(event) => setPlanOverride(event.target.value)} className={inputClassName}>
                      {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({plan.code})</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Ciclo contratado">
                    <select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as BillingCycle)} className={inputClassName}>
                      <option value="monthly">Mensual</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </Field>
                  <Input label="Precio mensual efectivo" type="number" value={effectiveMonthlyPrice} onChange={setEffectiveMonthlyPrice} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input label="Inicio del plan" type="date" value={planStartAt} onChange={setPlanStartAt} />
                  <Input label="Vence el" type="date" value={planEndsAt} onChange={setPlanEndsAt} />
                  <Input label="Próxima renovación" type="date" value={nextRenewalAt} onChange={setNextRenewalAt} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Límite de usuarios" type="number" value={userLimit} onChange={setUserLimit} />
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-200">
                    <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} />
                    Renovación automática informativa
                  </label>
                </div>
                <Field label="Nota interna">
                  <textarea rows={4} value={moderationNote} onChange={(event) => setModerationNote(event.target.value)} className={inputClassName} />
                </Field>
                <button type="submit" disabled={savingTenant} className="w-full rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#f97316)] py-3 font-bold text-slate-950 disabled:opacity-60">
                  {savingTenant ? "Guardando..." : "Guardar configuración contractual"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-400">Seleccioná un taller para editar su contrato.</p>
            )}
          </Panel>
        </section>

        <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Catálogo de planes" subtitle="Base comercial de referencia">
            <form onSubmit={savePlan} className="space-y-4">
              <div className="space-y-3">
                {plans.map((plan) => (
                  <button key={plan.id} type="button" onClick={() => hydratePlan(plan)} className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{plan.name}</p>
                        <p className="text-xs text-slate-400">{plan.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-violet-200">${plan.monthlyPrice.toLocaleString("es-AR")}</p>
                        <p className="text-xs text-slate-400">{plan.maxUsers} usuarios</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Input label="Código" value={planForm.code} onChange={(value) => setPlanForm((prev) => ({ ...prev, code: value.toLowerCase() }))} />
              <Input label="Nombre" value={planForm.name} onChange={(value) => setPlanForm((prev) => ({ ...prev, name: value }))} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Precio mensual" type="number" value={planForm.monthlyPrice} onChange={(value) => setPlanForm((prev) => ({ ...prev, monthlyPrice: value }))} />
                <Input label="Máx. usuarios" type="number" value={planForm.maxUsers} onChange={(value) => setPlanForm((prev) => ({ ...prev, maxUsers: value }))} />
              </div>
              <Input label="Máx. órdenes" type="number" value={planForm.maxWorkOrders} onChange={(value) => setPlanForm((prev) => ({ ...prev, maxWorkOrders: value }))} />
              <Field label="Features">
                <textarea rows={3} value={planForm.features} onChange={(event) => setPlanForm((prev) => ({ ...prev, features: event.target.value }))} className={inputClassName} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <input type="checkbox" checked={planForm.active} onChange={(event) => setPlanForm((prev) => ({ ...prev, active: event.target.checked }))} />
                Plan activo
              </label>
              <button type="submit" disabled={savingPlan} className="w-full rounded-2xl bg-[linear-gradient(135deg,#8b5cf6,#3b82f6)] py-3 font-bold text-white disabled:opacity-60">
                {savingPlan ? "Guardando..." : "Crear o actualizar plan"}
              </button>
            </form>
          </Panel>

          <div className="space-y-8">
            <Panel title="Finanzas de 81cc" subtitle="KPIs explicados y distribución visual">
              <div className="grid gap-4 md:grid-cols-2">
                <FinanceTile label="ARR proyectado" value={`$${(finances?.headline.projectedArr ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.projectedArr ?? ""} />
                <FinanceTile label="Take rate" value={`${(finances?.headline.takeRate ?? 0).toFixed(1).replace(".", ",")}%`} description={finances?.descriptions.takeRate ?? ""} />
                <FinanceTile label="Volumen procesado" value={`$${(finances?.headline.processedVolume ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.processedVolume ?? ""} />
                <FinanceTile label="Talleres pagos" value={finances?.headline.activeTenants ?? 0} description={finances?.descriptions.activeTenants ?? ""} />
              </div>
            </Panel>

            <div className="grid gap-8 lg:grid-cols-2">
              <ChartPanel title="MRR por plan">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={finances?.charts.byPlan ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="mrr" name="MRR" radius={[8, 8, 0, 0]}>
                      {(finances?.charts.byPlan ?? []).map((entry) => <Cell key={entry.code} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Distribución por ciclo">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={finances?.charts.byCycle ?? []} dataKey="tenants" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={4}>
                      {(finances?.charts.byCycle ?? []).map((entry) => <Cell key={entry.cycle} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            <ChartPanel title="Alertas de vencimiento">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={finances?.charts.expiringBuckets ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Talleres" radius={[8, 8, 0, 0]}>
                    {(finances?.charts.expiringBuckets ?? []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </section>

        <Panel title="Usuarios de prueba" subtitle="Sólo visible para superadmin">
          <SimpleTable
            headers={["Usuario", "Rol", "Ámbito", "Email", "Contraseña"]}
            rows={testAccounts.map((account) => [
              <div key={`${account.email}-name`}><p className="font-semibold text-white">{account.name}</p><p className="text-xs text-slate-400">{account.notes}</p></div>,
              <RolePill key={`${account.email}-role`} role={account.role} />,
              <span key={`${account.email}-scope`} className="text-sm text-slate-300">{account.scope}</span>,
              <span key={`${account.email}-email`} className="text-sm text-sky-200">{account.email}</span>,
              <code key={`${account.email}-password`} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-100">{account.password}</code>,
            ])}
            emptyText="No hay cuentas de prueba cargadas."
          />
        </Panel>

        <Panel title="Usuarios globales" subtitle="Filtros rápidos de acceso y actividad">
          <div className="grid gap-3 md:grid-cols-3">
            <input type="text" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar usuario, email o taller" className={inputClassName} />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={inputClassName}>
              <option value="todos">Todos los roles</option>
              <option value="owner">Dueños</option>
              <option value="employee">Empleados</option>
              <option value="superadmin">Superadmins</option>
            </select>
            <select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} className={inputClassName}>
              <option value="todos">Todos los talleres</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
          <div className="mt-4">
            <SimpleTable
              headers={["Usuario", "Rol", "Taller", "Último acceso"]}
              rows={filteredUsers.map((entry) => [
                <div key={`${entry.id}-user`}><p className="font-semibold text-white">{entry.name}</p><p className="text-xs text-slate-400">{entry.email}</p></div>,
                <RolePill key={`${entry.id}-role`} role={entry.role} />,
                <span key={`${entry.id}-tenant`} className="text-sm text-slate-300">{entry.tenantName}</span>,
                <span key={`${entry.id}-last`} className="text-sm text-slate-400">{entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleString("es-AR") : "Sin sesiones"}</span>,
              ])}
              emptyText="No hay usuarios que coincidan con los filtros actuales."
            />
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)] backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-200">{label}{children}</label>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-semibold text-slate-200">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} /></label>;
}

function KpiCard({ label, value, description, tone }: { label: string; value: string | number; description: string; tone: "sky" | "rose" | "amber" | "violet" | "emerald" }) {
  const tones = { sky: "border-sky-400/18 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.75))]", rose: "border-rose-400/18 bg-[linear-gradient(135deg,rgba(244,63,94,0.16),rgba(15,23,42,0.75))]", amber: "border-amber-400/18 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(15,23,42,0.75))]", violet: "border-violet-400/18 bg-[linear-gradient(135deg,rgba(139,92,246,0.16),rgba(15,23,42,0.75))]", emerald: "border-emerald-400/18 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.75))]" };
  return <div className={`rounded-[1.7rem] border p-5 ${tones[tone]}`}><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/75">{label}</p><p className="mt-3 text-3xl font-extrabold text-white">{value}</p><p className="mt-3 text-sm text-slate-300/80">{description}</p></div>;
}

function FinanceTile({ label, value, description }: { label: string; value: string | number; description: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/70">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p><p className="mt-2 text-sm text-slate-300/75">{description}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-white">{value}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-rose-400/25 bg-rose-400/10 text-rose-200"}`}>{active ? "Activo" : "Suspendido"}</span>;
}

function WarningBadge({ level }: { level: SuperadminTenant["warningLevel"] }) {
  const map = { normal: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200", "30d": "border-amber-400/25 bg-amber-400/10 text-amber-200", "15d": "border-orange-400/25 bg-orange-400/10 text-orange-200", "7d": "border-rose-400/25 bg-rose-400/10 text-rose-200", expired: "border-red-500/25 bg-red-500/10 text-red-200" } as const;
  const label = { normal: "En regla", "30d": "A 30 días", "15d": "A 15 días", "7d": "A 7 días", expired: "Vencido" } as const;
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${map[level]}`}>{label[level]}</span>;
}

function RolePill({ role }: { role: string }) {
  const tones: Record<string, string> = { owner: "border-amber-400/25 bg-amber-400/10 text-amber-200", employee: "border-sky-400/25 bg-sky-400/10 text-sky-200", superadmin: "border-violet-400/25 bg-violet-400/10 text-violet-200", client: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" };
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tones[role] ?? "border-white/10 bg-white/5 text-slate-200"}`}>{role}</span>;
}

function AlertCard({ label, value, tone }: { label: string; value: string | number; tone: "amber" | "orange" | "rose" | "violet" }) {
  const tones = { amber: "border-amber-400/20 bg-amber-400/10 text-amber-100", orange: "border-orange-400/20 bg-orange-400/10 text-orange-100", rose: "border-rose-400/20 bg-rose-400/10 text-rose-100", violet: "border-violet-400/20 bg-violet-400/10 text-violet-100" };
  return <div className={`rounded-[1.6rem] border p-5 ${tones[tone]}`}><p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-75">{label}</p><p className="mt-3 text-3xl font-extrabold">{value}</p></div>;
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)]"><h3 className="mb-5 text-lg font-bold text-white">{title}</h3>{children}</div>;
}

function ContractOverview({ tenant }: { tenant: SuperadminTenant }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-white">{tenant.name}</p>
          <p className="text-sm text-slate-400">{tenant.ownerEmail}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-sky-300">{billingLabel(tenant.billingCycle)} · {tenant.effectivePlanLabel}</p>
        </div>
        <WarningBadge level={tenant.warningLevel} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Vence el" value={formatDate(tenant.planEndsAt)} />
        <MiniMetric label="Próxima renovación" value={formatDate(tenant.nextRenewalAt)} />
        <MiniMetric label="Tiempo restante" value={remainingLabel(tenant.remainingDays)} />
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows, emptyText }: { headers: string[]; rows: ReactNode[][]; emptyText: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-[0.22em] text-slate-500">
            {headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition hover:bg-white/[0.03]">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4">{cell}</td>)}
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-slate-400">{emptyText}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function toInputDate(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR");
}

function remainingLabel(days: number) {
  if (days < 0) return `Vencido hace ${Math.abs(days)} d`;
  if (days === 0) return "Vence hoy";
  return `${days} días`;
}

function billingLabel(cycle: BillingCycle) {
  if (cycle === "annual") return "Anual";
  if (cycle === "semiannual") return "Semestral";
  return "Mensual";
}
