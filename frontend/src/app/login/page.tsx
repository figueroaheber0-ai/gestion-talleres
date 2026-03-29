"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import type { TenantChoice } from "@/lib/auth-api";

type TabRole = "employee" | "owner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<TabRole>("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantChoices, setTenantChoices] = useState<TenantChoice[]>([]);

  const redirectByRole = (role: UserRole) => {
    router.push(role === "superadmin" ? "/superadmin" : "/");
  };

  const resetForTab = (next: TabRole) => {
    setTab(next);
    setEmail("");
    setPassword("");
    setError("");
    setTenantChoices([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(email, password);

    setLoading(false);
    if (result.requiresTenantSelection) {
      setTenantChoices(result.accounts ?? []);
      return;
    }
    if (result.success) {
      redirectByRole(email.toLowerCase().trim() === "herber.superadmin@81cc.app" ? "superadmin" : tab);
      return;
    }

    setError(result.error ?? "No se pudo iniciar sesión.");
  };

  const handleTenantSelection = async (tenantId: string) => {
    setLoading(true);
    setError("");
    const result = await login(email, password, tenantId);
    setLoading(false);

    if (result.success) {
      redirectByRole(tab);
      return;
    }

    setError(result.error ?? "No se pudo iniciar sesión en el taller seleccionado.");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(245,158,11,0.10),transparent_22%),linear-gradient(180deg,#08101d_0%,#0a1322_46%,#07111f_100%)] lg:flex">
      <section
        className="relative hidden overflow-hidden p-12 lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
        style={{ background: "linear-gradient(145deg, #071526 0%, #0d2340 45%, #12345b 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -right-16 top-16 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute bottom-8 left-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="text-4xl font-extrabold tracking-tight text-white" data-display="true">
            81<span className="text-amber-400">cc</span>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90">
            Plataforma operativa para talleres
          </p>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-extrabold leading-[0.96] text-white" data-display="true">
            Gestión real para talleres que no quieren trabajar a ciegas.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-blue-100/80">
            Turnos, órdenes, clientes, finanzas y seguimiento del vehículo en una sola consola con mirada de negocio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              "Órdenes de trabajo",
              "Historial de vehículos",
              "Finanzas en tiempo real",
              "Portal para clientes",
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 rounded-[1.75rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-sm font-extrabold text-slate-950">
              2R
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                &quot;Desde que usamos 81cc en Taller 2R, tenemos más control del trabajo y menos tiempo perdido.&quot;
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-blue-200">
                Roberto Díaz · Taller 2R
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center text-3xl font-extrabold text-white lg:hidden" data-display="true">
            81<span className="text-amber-400">cc</span>
          </div>

          <div className="panel-shell-strong rounded-[2rem] p-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Acceso seguro
            </p>
            <h2 className="mb-1 text-3xl font-extrabold text-white" data-display="true">
              Iniciar sesión
            </h2>
            <p className="mb-8 text-sm text-slate-400">
              Usá tus credenciales para ingresar a 81cc.
            </p>

            <div className="mb-6 flex gap-1 rounded-2xl border border-white/8 bg-slate-950/70 p-1">
              <button
                type="button"
                onClick={() => resetForTab("employee")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  tab === "employee"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Empleado
              </button>
              <button
                type="button"
                onClick={() => resetForTab("owner")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  tab === "owner"
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Dueño / Admin
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Email">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setTenantChoices([]);
                  }}
                  placeholder={tab === "employee" ? "mecanico@taller2r.com" : "admin@taller2r.com"}
                  className="w-full rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                />
              </Field>

              <Field label="Contraseña">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                      setTenantChoices([]);
                    }}
                    placeholder="Ingresá tu contraseña"
                    className="w-full rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3 pr-14 text-white placeholder-slate-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-200"
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </Field>

              {error ? (
                <div className="rounded-2xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {tenantChoices.length ? (
                <div className="rounded-2xl border border-amber-700/35 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                  <p className="font-semibold">Este usuario trabaja en varios talleres.</p>
                  <p className="mt-1 text-amber-200/90">Elegí dónde querés iniciar esta sesión.</p>
                  <div className="mt-3 space-y-2">
                    {tenantChoices.map((account) => (
                      <button
                        key={account.tenantId}
                        type="button"
                        onClick={() => void handleTenantSelection(account.tenantId)}
                        className="w-full rounded-xl border border-amber-600/35 bg-amber-900/25 px-3 py-2 text-left font-semibold text-amber-50 transition hover:bg-amber-800/35"
                      >
                        {account.tenantName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                id="login-btn"
                type="submit"
                disabled={loading}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold transition active:scale-[0.98] ${
                  tab === "owner"
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-950/30"
                    : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-950/30"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {loading ? "Iniciando sesión..." : `Ingresar como ${tab === "owner" ? "Dueño" : "Empleado"}`}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/registro" className="font-semibold text-amber-300 hover:text-amber-200">
                Crear cuenta de taller
              </Link>
              <Link href="/registro-equipo" className="font-semibold text-sky-300 hover:text-sky-200">
                Aceptar invitación de equipo
              </Link>
              <Link href="/portal" className="font-semibold text-emerald-300 hover:text-emerald-200">
                Portal para clientes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  );
}
