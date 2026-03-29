"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerOwner } from "@/lib/auth-api";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    workshopName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await registerOwner(form);
      setSuccess("Cuenta creada. Ahora puedes iniciar sesión.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-8">
        <h1 className="mb-2 text-3xl font-extrabold text-white">Crear cuenta de taller</h1>
        <p className="mb-8 text-sm text-gray-400">Alta real en SQL dentro de 81cc para el dueño del taller.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ["workshopName", "Nombre del taller"],
            ["name", "Tu nombre"],
            ["email", "Email"],
            ["password", "Contraseña"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-semibold text-gray-300">{label}</label>
              <input
                type={key === "password" ? "password" : "text"}
                value={form[key as keyof typeof form]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>
          ))}

          {(error || success) && (
            <div className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-red-950/40 text-red-400" : "bg-green-950/40 text-green-400"}`}>
              {error || success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>

        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
