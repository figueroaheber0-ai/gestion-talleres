"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addClientPortalVehicle,
  clearStoredClientToken,
  fetchClientPortal,
  getStoredClientToken,
  loginClient,
  registerClient,
  setStoredClientToken,
  updateClientPortalVehicleProfile,
  type PortalResponse,
  type VehicleHistoryResponse,
} from "@/lib/auth-api";

const EMPTY_LOGIN_FORM = { email: "", password: "" };
const EMPTY_REGISTER_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  plate: "",
  brand: "",
  model: "",
  year: "",
};
const EMPTY_VEHICLE_FORM = {
  plate: "",
  brand: "",
  model: "",
  year: "",
};

type VehicleProfileForm = {
  alias: string;
  color: string;
  notes: string;
  insuranceProvider: string;
  policyNumber: string;
};

export default function PortalPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [portal, setPortal] = useState<PortalResponse | null>(null);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [profiles, setProfiles] = useState<Record<string, VehicleProfileForm>>({});
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [savingProfile, setSavingProfile] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!portal) return { vehicles: 0, activeRepairs: 0, updates: 0, workshops: 0 };
    return {
      vehicles: portal.vehicles.length,
      activeRepairs: portal.vehicles.filter((vehicle) => getCurrentWorkOrder(vehicle)).length,
      updates: portal.vehicles.reduce(
        (total, vehicle) => total + vehicle.workOrders.flatMap((order) => order.updates).length,
        0,
      ),
      workshops: new Set(portal.vehicles.flatMap((vehicle) => vehicle.workshops)).size,
    };
  }, [portal]);

  const loadPortal = async (token: string) => {
    const nextPortal = await fetchClientPortal(token);
    setPortal(nextPortal);
    setProfiles(
      Object.fromEntries(
        nextPortal.vehicles.map((vehicle) => [
          vehicle.id,
          {
            alias: vehicle.profile.alias ?? "",
            color: vehicle.profile.color ?? "",
            notes: vehicle.profile.notes ?? "",
            insuranceProvider: vehicle.profile.insuranceProvider ?? "",
            policyNumber: vehicle.profile.policyNumber ?? "",
          },
        ]),
      ),
    );
  };

  useEffect(() => {
    const token = getStoredClientToken();
    if (!token) return;
    void loadPortal(token).catch(() => {
      clearStoredClientToken();
      setPortal(null);
    });
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const session = await loginClient(loginForm.email, loginForm.password);
      setStoredClientToken(session.token);
      await loadPortal(session.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await registerClient({
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone || undefined,
        password: registerForm.password,
        plate: registerForm.plate,
        brand: registerForm.brand,
        model: registerForm.model,
        year: registerForm.year ? Number(registerForm.year) : undefined,
      });
      setMode("login");
      setLoginForm({ email: registerForm.email, password: registerForm.password });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getStoredClientToken();
    if (!token) {
      setError("La sesión del cliente no está disponible.");
      return;
    }
    try {
      setAddingVehicle(true);
      setError("");
      await addClientPortalVehicle(token, {
        plate: vehicleForm.plate,
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
      });
      setVehicleForm(EMPTY_VEHICLE_FORM);
      await loadPortal(token);
    } catch (vehicleError) {
      setError(vehicleError instanceof Error ? vehicleError.message : "No se pudo agregar el vehículo.");
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleSaveProfile = async (vehicleId: string) => {
    const token = getStoredClientToken();
    if (!token || !profiles[vehicleId]) return;
    try {
      setSavingProfile(vehicleId);
      setError("");
      await updateClientPortalVehicleProfile(token, vehicleId, profiles[vehicleId]);
      await loadPortal(token);
      setEditingVehicleId(null);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "No se pudo guardar la ficha del vehículo.");
    } finally {
      setSavingProfile(null);
    }
  };

  if (!portal) {
    return <AuthView
      mode={mode}
      setMode={setMode}
      loginForm={loginForm}
      setLoginForm={setLoginForm}
      registerForm={registerForm}
      setRegisterForm={setRegisterForm}
      loading={loading}
      error={error}
      handleLogin={handleLogin}
      handleRegister={handleRegister}
    />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.12),transparent_22%),linear-gradient(180deg,#07111f_0%,#0b1424_42%,#0b1220_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Portal del cliente</p>
            <h1 className="mt-2 text-4xl font-extrabold">Seguimiento unificado de tus autos</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Hola, {portal.name}. Acá podés ver el estado actual de cada reparación, sumar más vehículos propios y mantener una ficha básica de cada auto.
            </p>
          </div>
          <button onClick={() => { clearStoredClientToken(); setPortal(null); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            Cerrar sesión
          </button>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Vehículos" value={summary.vehicles} />
          <SummaryCard label="Reparaciones activas" value={summary.activeRepairs} />
          <SummaryCard label="Actualizaciones" value={summary.updates} />
          <SummaryCard label="Talleres vinculados" value={summary.workshops} />
        </div>

        <section className="mb-8 grid gap-6 rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)] backdrop-blur lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Cuenta sincronizada</p>
            <h2 className="mt-2 text-2xl font-bold">Tu historial se consolida dentro de 81cc</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Si usaste el mismo email en distintos talleres, el portal reúne automáticamente órdenes, avances y controles sugeridos. También podés completar alias, color, notas y cobertura de cada auto.
            </p>
          </div>
          <form onSubmit={handleAddVehicle} className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Agregar otro auto</p>
              <h3 className="mt-2 text-xl font-bold">Cargar un vehículo propio</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <PortalInput placeholder="Patente" value={vehicleForm.plate} onChange={(value) => setVehicleForm((current) => ({ ...current, plate: value }))} />
              <PortalInput placeholder="Marca" value={vehicleForm.brand} onChange={(value) => setVehicleForm((current) => ({ ...current, brand: value }))} />
              <PortalInput placeholder="Modelo" value={vehicleForm.model} onChange={(value) => setVehicleForm((current) => ({ ...current, model: value }))} />
              <PortalInput placeholder="Año" value={vehicleForm.year} onChange={(value) => setVehicleForm((current) => ({ ...current, year: value }))} />
            </div>
            <button type="submit" disabled={addingVehicle} className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
              {addingVehicle ? "Guardando vehículo..." : "Agregar vehículo"}
            </button>
          </form>
        </section>

        <div className="space-y-8">
          {portal.vehicles.map((vehicle) => (
            <VehicleSection
              key={vehicle.id}
              vehicle={vehicle}
              profile={profiles[vehicle.id]}
              isEditing={editingVehicleId === vehicle.id}
              isSaving={savingProfile === vehicle.id}
              onToggleEdit={() => setEditingVehicleId((current) => current === vehicle.id ? null : vehicle.id)}
              onProfileChange={(next) => setProfiles((current) => ({ ...current, [vehicle.id]: { ...current[vehicle.id], ...next } }))}
              onSave={() => void handleSaveProfile(vehicle.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthView({
  mode,
  setMode,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  loading,
  error,
  handleLogin,
  handleRegister,
}: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  loginForm: typeof EMPTY_LOGIN_FORM;
  setLoginForm: React.Dispatch<React.SetStateAction<typeof EMPTY_LOGIN_FORM>>;
  registerForm: typeof EMPTY_REGISTER_FORM;
  setRegisterForm: React.Dispatch<React.SetStateAction<typeof EMPTY_REGISTER_FORM>>;
  loading: boolean;
  error: string;
  handleLogin: (event: React.FormEvent) => Promise<void>;
  handleRegister: (event: React.FormEvent) => Promise<void>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_24%),linear-gradient(180deg,#07111f_0%,#0b1424_50%,#0b1220_100%)] p-6 text-white">
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_24px_70px_rgba(2,6,23,0.28)] backdrop-blur">
        <div className="mb-6 flex gap-2">
          <button onClick={() => setMode("login")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}>Iniciar sesión</button>
          <button onClick={() => setMode("register")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}>Registrarme</button>
        </div>
        <h1 className="mb-2 text-3xl font-extrabold">{mode === "login" ? "Acceso para clientes" : "Crear acceso de cliente"}</h1>
        <p className="mb-8 max-w-2xl text-slate-300">Portal de clientes de 81cc para consultar el estado actual de reparación, el historial de cada vehículo y completar una ficha básica del auto.</p>
        {error && <div className="mb-4 rounded-xl bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <PortalInput type="email" placeholder="Email" value={loginForm.email} onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))} />
            <PortalInput type="password" placeholder="Contraseña" value={loginForm.password} onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))} />
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3.5 font-bold transition hover:bg-blue-500 disabled:opacity-60">{loading ? "Ingresando..." : "Entrar al portal"}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="grid gap-4 md:grid-cols-2">
            <PortalInput placeholder="Nombre completo" value={registerForm.name} onChange={(value) => setRegisterForm((current) => ({ ...current, name: value }))} />
            <PortalInput type="email" placeholder="Email" value={registerForm.email} onChange={(value) => setRegisterForm((current) => ({ ...current, email: value }))} />
            <PortalInput placeholder="Teléfono" value={registerForm.phone} onChange={(value) => setRegisterForm((current) => ({ ...current, phone: value }))} />
            <PortalInput type="password" placeholder="Contraseña" value={registerForm.password} onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))} />
            <PortalInput placeholder="Patente" value={registerForm.plate} onChange={(value) => setRegisterForm((current) => ({ ...current, plate: value }))} />
            <PortalInput placeholder="Marca" value={registerForm.brand} onChange={(value) => setRegisterForm((current) => ({ ...current, brand: value }))} />
            <PortalInput placeholder="Modelo" value={registerForm.model} onChange={(value) => setRegisterForm((current) => ({ ...current, model: value }))} />
            <PortalInput placeholder="Año" value={registerForm.year} onChange={(value) => setRegisterForm((current) => ({ ...current, year: value }))} />
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3.5 font-bold transition hover:bg-blue-500 disabled:opacity-60 md:col-span-2">{loading ? "Creando acceso..." : "Crear acceso del cliente"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function VehicleSection({
  vehicle,
  profile,
  isEditing,
  isSaving,
  onToggleEdit,
  onProfileChange,
  onSave,
}: {
  vehicle: VehicleHistoryResponse;
  profile: VehicleProfileForm;
  isEditing: boolean;
  isSaving: boolean;
  onToggleEdit: () => void;
  onProfileChange: (next: Partial<VehicleProfileForm>) => void;
  onSave: () => void;
}) {
  const currentOrder = getCurrentWorkOrder(vehicle);
  const updates = vehicle.workOrders.flatMap((order) => order.updates);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/65 shadow-[0_24px_70px_rgba(2,6,23,0.28)] backdrop-blur">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{vehicle.profile.alias ? `${vehicle.profile.alias} · ` : ""}{vehicle.brand} {vehicle.model}</h2>
            <p className="mt-1 text-slate-300">Patente {vehicle.plate} · {vehicle.year ?? "s/d"}{vehicle.profile.color ? ` · ${vehicle.profile.color}` : ""}</p>
            <p className="mt-2 text-sm text-slate-400">{vehicle.workshops.length === 1 ? `Historial registrado en ${vehicle.workshopName}` : `Historial sincronizado entre ${vehicle.workshops.join(", ")}`}</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
              <p className="text-slate-400">Estado actual</p>
              <p className="mt-1 font-bold text-white">{currentOrder ? humanizeWorkOrderStatus(currentOrder.status) : "Sin reparación activa"}</p>
              <p className="mt-1 text-xs text-slate-400">{currentOrder ? `Taller actual: ${currentOrder.workshopName}` : "Disponible para nuevos ingresos"}</p>
            </div>
            <button onClick={onToggleEdit} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10">{isEditing ? "Cerrar ficha" : "Editar ficha del auto"}</button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Ficha personal</p>
                <h3 className="mt-2 text-lg font-bold">Datos rápidos del vehículo</h3>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniInfo label="Alias" value={vehicle.profile.alias ?? "Sin alias"} />
              <MiniInfo label="Color" value={vehicle.profile.color ?? "Sin color"} />
              <MiniInfo label="Seguro" value={vehicle.profile.insuranceProvider ?? "Sin cobertura"} />
              <MiniInfo label="Póliza" value={vehicle.profile.policyNumber ?? "Sin número"} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/45 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Notas del cliente</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{vehicle.profile.notes ?? "Todavía no cargaste notas para este vehículo."}</p>
            </div>
          </section>

          {isEditing && (
            <section className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Editar ficha</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PortalInput placeholder="Alias" value={profile.alias} onChange={(value) => onProfileChange({ alias: value })} />
                <PortalInput placeholder="Color" value={profile.color} onChange={(value) => onProfileChange({ color: value })} />
                <PortalInput placeholder="Compañía de seguro" value={profile.insuranceProvider} onChange={(value) => onProfileChange({ insuranceProvider: value })} />
                <PortalInput placeholder="Número de póliza" value={profile.policyNumber} onChange={(value) => onProfileChange({ policyNumber: value })} />
                <textarea
                  placeholder="Notas útiles: ruidos, detalles cosméticos, documentación, recordatorios..."
                  value={profile.notes}
                  onChange={(event) => onProfileChange({ notes: event.target.value })}
                  className="min-h-28 rounded-xl border border-emerald-200/20 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 sm:col-span-2"
                />
              </div>
              <button onClick={onSave} disabled={isSaving} className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60">{isSaving ? "Guardando ficha..." : "Guardar ficha del vehículo"}</button>
            </section>
          )}

          <section className="rounded-[1.6rem] border border-blue-400/20 bg-blue-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Reparación actual</p>
            {currentOrder ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-blue-300/20 bg-blue-200/10 px-3 py-1 text-sm font-semibold text-blue-100">{humanizeWorkOrderStatus(currentOrder.status)}</span>
                  <span className="text-sm text-blue-100/80">Ingresó el {formatDate(currentOrder.createdAt)} en {currentOrder.workshopName}</span>
                </div>
                <p className="text-sm leading-6 text-blue-50/90">{currentOrder.diagnostic ?? currentOrder.appointment?.reason ?? "Todavía no hay diagnóstico cargado."}</p>
              </div>
            ) : <p className="mt-4 text-sm text-blue-100/85">Este vehículo no tiene una orden activa en este momento.</p>}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Historial del vehículo</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">{vehicle.workOrders.length} órdenes</span>
            </div>
            <div className="space-y-4">
              {vehicle.workOrders.map((order) => (
                <article key={order.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">Orden #{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(order.createdAt)}{order.appointment ? ` · ${order.appointment.reason}` : ""}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChipClass(order.status)}`}>{humanizeWorkOrderStatus(order.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200">{order.workshopName}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{order.diagnostic ?? "Sin diagnóstico cargado todavía."}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Actualizaciones del taller</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">{updates.length}</span>
            </div>
            <div className="space-y-3">
              {updates.length ? updates.map((update) => {
                const sourceOrder = vehicle.workOrders.find((order) => order.updates.some((orderUpdate) => orderUpdate.id === update.id));
                return (
                  <div key={update.id} className="rounded-[1.4rem] border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="font-semibold text-emerald-100">{update.title}</p>
                    <p className="mt-1 text-xs text-emerald-100/70">{sourceOrder?.workshopName ?? "Taller"} · {formatDate(update.createdAt)}</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/90">{update.message}</p>
                  </div>
                );
              }) : <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-400">Aún no hay actualizaciones publicadas para este vehículo.</div>}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p><p className="mt-3 text-3xl font-extrabold text-white">{value}</p></div>;
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-white">{value}</p></div>;
}

function PortalInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder: string; type?: string; }) {
  return <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500" />;
}

function getCurrentWorkOrder(vehicle: VehicleHistoryResponse) {
  return vehicle.workOrders.find((order) => ["pending", "estimating", "waiting_parts", "repairing"].includes(order.status)) ?? null;
}

function humanizeWorkOrderStatus(status: string) {
  return ({
    pending: "Pendiente de revisión",
    estimating: "En diagnóstico",
    waiting_parts: "Esperando repuestos",
    repairing: "En reparación",
    finished: "Listo para entregar",
    cancelled: "Cancelado",
  } as Record<string, string>)[status] ?? status;
}

function statusChipClass(status: string) {
  return ({
    pending: "bg-slate-200/15 text-slate-100",
    estimating: "bg-violet-400/15 text-violet-100",
    waiting_parts: "bg-amber-400/15 text-amber-100",
    repairing: "bg-blue-400/15 text-blue-100",
    finished: "bg-emerald-400/15 text-emerald-100",
    cancelled: "bg-rose-400/15 text-rose-100",
  } as Record<string, string>)[status] ?? "bg-slate-200/15 text-slate-100";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR");
}
