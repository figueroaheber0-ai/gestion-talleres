"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { acceptStaffInvite, previewStaffInvite, type StaffInvite } from "@/lib/auth-api";

export default function RegistroEquipoPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [invite, setInvite] = useState<StaffInvite | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setInvite(await previewStaffInvite(token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo validar la invitacion.");
      }
    };

    void load();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 4) {
      setError("La contrasena debe tener al menos 4 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await acceptStaffInvite({ token, password });
      setSuccess(`Cuenta creada para ${result.tenantName}. Ya podes iniciar sesion.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo aceptar la invitacion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-extrabold text-white">Activar acceso de equipo</h1>
        <p className="mt-2 text-sm text-gray-400">
          Invitacion segura para trabajar dentro de un taller sin crear usuarios manuales.
        </p>

        {invite && (
          <div className="mt-6 rounded-2xl border border-blue-900/60 bg-blue-950/40 p-4 text-sm text-blue-100">
            <p className="font-semibold">{invite.name}</p>
            <p className="mt-1">{invite.email}</p>
            <p className="mt-1 text-blue-200">Taller: {invite.tenantName}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-gray-300">
              Contrasena nueva
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-bold text-gray-300">
              Repetir contrasena
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Activando..." : "Activar cuenta"}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm">
          <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
