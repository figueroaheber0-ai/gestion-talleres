"use client";
import { useEffect, useState } from "react";
import { fetchSessions, getStoredStaffToken } from "@/lib/auth-api";

export default function SesionesPage() {
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      actorType: string;
      role: string;
      email: string;
      createdAt: string;
      lastSeenAt: string;
      active: boolean;
    }>
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token) return;

      try {
        setSessions(await fetchSessions(token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el registro de sesiones.");
      }
    };

    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">Registro de sesiones</h1>
      <p className="mb-8 font-medium text-gray-500">Actividad persistida en SQL para usuarios del taller y clientes.</p>

      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500">
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Inicio</th>
              <th className="px-6 py-4">Ultima actividad</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-6 py-4 font-medium text-gray-900">{session.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{session.actorType}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{session.role}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(session.createdAt).toLocaleString("es-AR")}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(session.lastSeenAt).toLocaleString("es-AR")}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${session.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {session.active ? "Activa" : "Cerrada"}
                  </span>
                </td>
              </tr>
            ))}
            {!sessions.length && (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-500" colSpan={6}>
                  Todavia no hay sesiones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
