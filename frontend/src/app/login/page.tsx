"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import type { TenantChoice } from "@/lib/auth-api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALUE_PROPS = [
  "Turnos y clientes organizados",
  "Control de inventario en tiempo real",
  "Facturacion automatica",
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [pageReady, setPageReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tenantChoices, setTenantChoices] = useState<TenantChoice[]>([]);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "El correo electronico es obligatorio.";
    if (!EMAIL_REGEX.test(email.trim())) return "El email no es valido.";
    return "";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!password.trim()) return "La contrasena es obligatoria.";
    if (password.length < 6) return "La contrasena debe tener al menos 6 caracteres.";
    return "";
  }, [password, touched.password]);

  const isFormValid =
    EMAIL_REGEX.test(email.trim()) &&
    password.trim().length >= 6 &&
    !emailError &&
    !passwordError;

  const redirectByRole = (role: UserRole) => {
    router.push(role === "superadmin" ? "/superadmin" : "/");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setErrorMessage("");
    setSuccessMessage("");
    setTenantChoices([]);

    if (!isFormValid) {
      setErrorMessage("Revisa los datos ingresados para continuar.");
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.requiresTenantSelection) {
      setTenantChoices(result.accounts ?? []);
      return;
    }

    if (result.success) {
      if (!rememberMe) {
        localStorage.removeItem("81cc_session_token");
      }
      setSuccessMessage("Acceso correcto. Redirigiendo...");
      setTimeout(() => {
        redirectByRole(email.toLowerCase().trim() === "herber.superadmin@81cc.app" ? "superadmin" : "owner");
      }, 280);
      return;
    }

    setErrorMessage(result.error ?? "No se pudo iniciar sesion.");
  };

  const handleTenantSelection = async (tenantId: string) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const result = await login(email.trim(), password, tenantId);
    setLoading(false);

    if (result.success) {
      setSuccessMessage("Sesion iniciada. Redirigiendo...");
      setTimeout(() => redirectByRole("owner"), 280);
      return;
    }

    setErrorMessage(result.error ?? "No se pudo iniciar sesion en el taller seleccionado.");
  };

  if (!pageReady) {
    return (
      <main className="min-h-screen bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
          <section className="animate-pulse rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-900 p-6 lg:col-span-3">
            <div className="h-6 w-2/3 rounded bg-white/30" />
            <div className="mt-4 h-4 w-3/4 rounded bg-white/20" />
            <div className="mt-7 space-y-3">
              <div className="h-10 rounded bg-white/15" />
              <div className="h-10 rounded bg-white/15" />
              <div className="h-10 rounded bg-white/15" />
            </div>
          </section>
          <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <div className="h-6 w-1/2 rounded bg-slate-200" />
            <div className="mt-5 h-11 rounded bg-slate-200" />
            <div className="mt-3 h-11 rounded bg-slate-200" />
            <div className="mt-6 h-11 rounded bg-slate-300" />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
        <section className="login-fade-in relative order-1 overflow-hidden rounded-2xl border border-indigo-500/20 bg-[linear-gradient(140deg,#0f172a_0%,#1e293b_25%,#1e1b4b_70%,#7c3aed_100%)] p-6 text-white shadow-[0_20px_70px_rgba(30,41,59,0.28)] lg:col-span-3 lg:p-8">
          <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-violet-500/30 blur-3xl" />

          <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Gestion de taller simplificada
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
            81cc centraliza turnos, inventario, clientes y facturacion para que tomes decisiones con informacion en tiempo real.
          </p>

          <ul className="mt-6 space-y-3">
            {VALUE_PROPS.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <CheckIcon />
                <span className="text-sm font-medium text-slate-100 sm:text-base">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 rounded-xl border border-white/15 bg-[#0f172a]/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Vista de dashboard</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                <p className="text-xs text-slate-300">Turnos de hoy</p>
                <p className="mt-1 text-xl font-semibold">18</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                <p className="text-xs text-slate-300">OT activas</p>
                <p className="mt-1 text-xl font-semibold">11</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                <p className="text-xs text-slate-300">Facturado</p>
                <p className="mt-1 text-xl font-semibold">$2.4M</p>
              </div>
            </div>
          </div>

          <blockquote className="mt-6 rounded-xl border border-blue-300/20 bg-blue-900/30 p-4 text-sm leading-relaxed text-blue-100">
            &quot;Pase de Excel a 81cc y recupere 5 horas por semana&quot; - Carlos M., Taller San Martin
          </blockquote>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-900/25 px-4 py-2 text-xs font-semibold text-emerald-100">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-200" aria-hidden="true" />
            Datos seguros y encriptados
          </div>
        </section>

        <section className="login-fade-in order-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(30,41,59,0.10)] lg:col-span-2 lg:p-8">
          <Link href="/" className="inline-flex items-center text-2xl font-bold tracking-tight text-[#1e293b]">
            <span className="logo-pulse">81</span>
            <span className="text-[#2563eb]">cc</span>
          </Link>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900">Bienvenido a 81cc</h2>
          <p className="mt-2 text-sm text-slate-600">Plataforma integral para talleres mecanicos</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Correo electronico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-label="Correo electronico"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
                value={email}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="tu@taller.com"
                className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-[#2563eb]/25 ${
                  emailError ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-[#2563eb]"
                }`}
              />
              {emailError ? (
                <p id="email-error" className="mt-1 text-xs font-medium text-red-600">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Contrasena
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-slate-700">
                  Olvidaste tu contrasena?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-label="Contrasena"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  value={password}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Ingresa tu contrasena"
                  className={`h-11 w-full rounded-lg border px-3 pr-16 text-sm outline-none transition focus:ring-2 focus:ring-[#2563eb]/25 ${
                    passwordError ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-[#2563eb]"
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
              {passwordError ? (
                <p id="password-error" className="mt-1 text-xs font-medium text-red-600">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
              />
              Recordarme
            </label>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
            ) : null}
            {successMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            {tenantChoices.length ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-900">Este usuario trabaja en varios talleres.</p>
                <p className="mt-1 text-xs text-blue-700">Selecciona donde quieres iniciar esta sesion.</p>
                <div className="mt-2 space-y-2">
                  {tenantChoices.map((account) => (
                    <button
                      key={account.tenantId}
                      type="button"
                      onClick={() => void handleTenantSelection(account.tenantId)}
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-left text-sm font-medium text-blue-900 hover:bg-blue-100"
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
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/35 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Iniciando sesion...
                </>
              ) : (
                "Iniciar sesion"
              )}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">o</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled
            className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-500"
          >
            Continuar con Google (proximamente)
          </button>

          <div className="mt-5 space-y-2 text-sm">
            <p className="text-slate-600">
              No tenes cuenta?{" "}
              <Link href="/demo" className="font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
                Solicitar demo
              </Link>
            </p>
            <Link href="/demo" className="inline-block font-medium text-slate-500 hover:text-slate-700">
              Ver demo sin registrarme
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0 text-[#93c5fd]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
