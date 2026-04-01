"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { submitPasswordReset } from "@/lib/auth-api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    setError("");

    try {
      await submitPasswordReset(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/6 p-8 text-center text-white backdrop-blur-md">
        <p className="mb-4 text-red-300 font-medium">El enlace proporcionado es inválido o no está completo.</p>
        <Link href="/login" className="rounded-[1rem] bg-[#FFE707] px-6 py-3 text-sm font-bold text-[#190B47] transition hover:brightness-95">
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/6 p-6 sm:p-8 backdrop-blur-md shadow-[0_28px_80px_rgba(8,4,27,0.34)]">
      <div className="mb-6 relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A80]">Autenticación Segura</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-white/70">Escribe y guarda tu nueva contraseña para ingresar a Taller 2R.</p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="rounded-[1rem] border border-green-500/20 bg-green-500/10 p-4 text-sm leading-relaxed text-green-200">
            ¡Todo listo! Tu contraseña se ha actualizado correctamente.
          </div>
          <Link href="/login" className="block w-full rounded-[1.2rem] bg-[#FFE707] py-3.5 text-center text-base font-extrabold text-[#190B47] transition hover:brightness-95">
            Volver a inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white">Contraseña Nueva</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-[1.2rem] border border-white/15 bg-[#190B47]/50 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#FFE707] focus:bg-white/10"
              placeholder="Al menos 6 caracteres"
            />
          </label>

          {error && (
            <div className="rounded-[1rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password.length < 6}
            className="mt-4 w-full rounded-[1.2rem] bg-[#FFE707] py-3.5 text-base font-extrabold text-[#190B47] transition hover:brightness-95 focus:ring-4 focus:ring-[#FFE707]/20 disabled:opacity-50"
          >
            {loading ? "Validando..." : "Actualizar Contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-[#08041B] flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[#FFE707]/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-10 h-96 w-96 rounded-full bg-white/8 blur-3xl" />
      </div>

      <div className="z-10 w-full flex justify-center">
        <Suspense fallback={<div className="text-white">Cargando datos de validación...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
