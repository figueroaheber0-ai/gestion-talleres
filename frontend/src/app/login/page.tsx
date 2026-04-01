"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import type { TenantChoice } from "@/lib/auth-api";

type TabRole = "employee" | "owner";

const BENEFITS = [
  "Controla los autos en tu taller",
  "Organiza turnos y trabajos",
  "Gestiona todo desde un solo lugar",
];

const METRICS = [
  { value: "24/7", label: "Visibilidad del trabajo" },
  { value: "1", label: "Sistema para toda la operacion" },
  { value: "100%", label: "Foco en orden y control" },
];

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

    setError(result.error ?? "No se pudo iniciar sesion.");
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

    setError(result.error ?? "No se pudo iniciar sesion en el taller seleccionado.");
  };

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[#FFE707]/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-10 h-96 w-96 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-[#2400A2]/60 blur-3xl" />
        <div className="absolute inset-x-6 top-6 bottom-6 rounded-[2rem] border border-white/8" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.08fr_minmax(420px,480px)] lg:gap-10">
          <section className="hidden min-h-[640px] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/6 p-10 text-white shadow-[0_28px_80px_rgba(8,4,27,0.34)] backdrop-blur-sm lg:flex">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FFE707]">
                Sistema para talleres mecanicos
              </div>

              <div className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8A8A80]">Taller 2R</p>
                <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-[0.94] text-white" data-display="true">
                  Control total de tu taller mecanico
                </h1>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/72">
                  Una plataforma pensada para duenos de taller que necesitan orden, visibilidad y control diario sin
                  depender de procesos improvisados.
                </p>
              </div>

              <div className="mt-10 space-y-4">
                {BENEFITS.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#FFFFFF]/5 px-4 py-4"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFE707] text-sm font-extrabold text-[#190B47]">
                      2R
                    </span>
                    <p className="text-base font-medium text-white">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {METRICS.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5"
                >
                  <p className="text-3xl font-extrabold text-[#FFE707]" data-display="true">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/72">{metric.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="auth-card w-full rounded-[2rem] p-5 text-white sm:p-7 lg:p-8">
              <div className="mb-8 lg:hidden">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8A8A80]">Taller 2R</p>
                <h1 className="mt-3 text-3xl font-extrabold text-white" data-display="true">
                  Control total de tu taller mecanico
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/74">
                  Controla los autos, organiza turnos y lleva tu operacion desde un solo lugar.
                </p>
              </div>

              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8A8A80]">Acceso seguro</p>
                  <h2 className="mt-2 text-3xl font-extrabold text-white" data-display="true">
                    Ingresar al sistema
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-white/74">
                    Inicia sesion para ver el estado del taller, las ordenes activas y el trabajo del dia.
                  </p>
                </div>
                <div className="hidden rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right sm:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A8A80]">Producto</p>
                  <p className="mt-1 text-lg font-extrabold text-white">Taller 2R</p>
                </div>
              </div>

              <div className="mb-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-[#190B47]/55 p-3 sm:grid-cols-3">
                {BENEFITS.map((benefit) => (
                  <div key={benefit} className="rounded-[1.2rem] border border-white/6 bg-white/5 px-3 py-3">
                    <p className="text-sm font-medium leading-snug text-white/82">{benefit}</p>
                  </div>
                ))}
              </div>

              <div className="mb-6 flex gap-1 rounded-[1.35rem] border border-white/10 bg-[#190B47]/70 p-1.5">
                <button
                  type="button"
                  onClick={() => resetForTab("employee")}
                  className={`flex-1 rounded-[1rem] px-3 py-3 text-sm font-bold transition ${
                    tab === "employee"
                      ? "bg-[#FFE707] text-[#190B47] shadow-[0_14px_32px_rgba(255,231,7,0.22)]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Empleado
                </button>
                <button
                  type="button"
                  onClick={() => resetForTab("owner")}
                  className={`flex-1 rounded-[1rem] px-3 py-3 text-sm font-bold transition ${
                    tab === "owner"
                      ? "bg-white text-[#190B47] shadow-[0_14px_32px_rgba(255,255,255,0.16)]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Dueno / Admin
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Correo electronico">
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
                    placeholder={tab === "employee" ? "mecanico@taller2r.com" : "dueno@taller2r.com"}
                    className="w-full rounded-[1.2rem] border border-[#8A8A80]/35 bg-[#190B47]/68 px-4 py-3.5 text-white placeholder:text-[#8A8A80] outline-none transition focus:border-[#FFE707] focus:ring-4 focus:ring-[#FFE707]/15"
                  />
                </Field>

                <Field label="Contrasena">
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
                      placeholder="Ingresa tu contrasena"
                      className="w-full rounded-[1.2rem] border border-[#8A8A80]/35 bg-[#190B47]/68 px-4 py-3.5 pr-16 text-white placeholder:text-[#8A8A80] outline-none transition focus:border-[#FFE707] focus:ring-4 focus:ring-[#FFE707]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8A80] transition hover:text-white"
                    >
                      {showPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <Link href="/forgot-password" className="text-sm font-medium text-[#FFE707] transition hover:text-white">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </Field>

                {error ? (
                  <div className="rounded-[1.2rem] border border-red-300/20 bg-red-950/35 px-4 py-3 text-sm text-red-100">
                    {error}
                  </div>
                ) : null}

                {tenantChoices.length ? (
                  <div className="rounded-[1.4rem] border border-[#FFE707]/25 bg-[#190B47]/72 px-4 py-4 text-sm text-white">
                    <p className="font-semibold text-[#FFE707]">Este usuario trabaja en varios talleres.</p>
                    <p className="mt-1 text-white/74">Selecciona donde quieres iniciar esta sesion.</p>
                    <div className="mt-3 space-y-2.5">
                      {tenantChoices.map((account) => (
                        <button
                          key={account.tenantId}
                          type="button"
                          onClick={() => void handleTenantSelection(account.tenantId)}
                          className="w-full rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-left font-semibold text-white transition hover:border-[#FFE707]/40 hover:bg-white/10"
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
                  className="flex w-full items-center justify-center rounded-[1.2rem] bg-[#FFE707] px-4 py-3.5 text-base font-extrabold text-[#190B47] transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[#FFE707]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm">
                <Link href="/registro" className="font-semibold text-[#FFE707] transition hover:text-white">
                  No tenes cuenta? Crear cuenta
                </Link>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <Link href="/registro-equipo" className="font-medium text-white/72 transition hover:text-white">
                    Aceptar invitacion de equipo
                  </Link>
                  <Link href="/portal" className="font-medium text-white/72 transition hover:text-white">
                    Portal para clientes
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
      {children}
    </label>
  );
}
