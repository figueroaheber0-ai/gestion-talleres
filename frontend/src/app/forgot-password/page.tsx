"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await requestPasswordReset(email);
      setSuccess(true);
      if (res.devToken) {
        setDevToken(res.devToken);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-[#08041B] flex items-center justify-center p-4">
      {/* Elementos decorativos de fondo similares a login */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[#FFE707]/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-10 h-96 w-96 rounded-full bg-white/8 blur-3xl" />
      </div>

      <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/6 p-6 sm:p-8 backdrop-blur-md shadow-[0_28px_80px_rgba(8,4,27,0.34)]">
        <div className="mb-6 relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A80]">Recuperar Acceso</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Olvidé mi contraseña</h1>
          <p className="mt-2 text-sm text-white/70">Ingresa tu correo asociado y te enviaremos un enlace seguro para crear una nueva de forma inmediata.</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-[1rem] border border-green-500/20 bg-green-500/10 p-4 text-sm leading-relaxed text-green-200">
              Si tu correo está validado, recibirás un enlace mágico en pocos segundos.
            </div>
            {devToken && (
              <div className="rounded-[1rem] border border-[#FFE707]/20 bg-[#FFE707]/10 p-4 text-xs font-mono text-[#FFE707] break-all">
                [DESARROLLO] Token generado: <br/>{devToken}
                <br/><br/>
                <Link href={`/reset-password?token=${devToken}`} className="underline font-bold">Ir a restablecer contraseña</Link>
              </div>
            )}
            <Link href="/login" className="block w-full rounded-[1.2rem] bg-white/10 py-3.5 text-center text-sm font-bold text-white transition hover:bg-white/20 hover:text-white">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">Correo electrónico</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full rounded-[1.2rem] border border-white/15 bg-[#190B47]/50 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#FFE707] focus:bg-white/10"
                placeholder="tu@email.com"
              />
            </label>

            {error && (
              <div className="rounded-[1rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-[1.2rem] bg-[#FFE707] py-3.5 text-base font-extrabold text-[#190B47] transition hover:brightness-95 focus:ring-4 focus:ring-[#FFE707]/20 disabled:opacity-50"
            >
              {loading ? "Procesando..." : "Solicitar recuperación"}
            </button>

            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm font-semibold text-white/50 transition hover:text-white">
                Volver a la pantalla principal
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
