"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchDashboardSummary,
  getStoredStaffToken,
  type DashboardResponse,
} from "@/lib/auth-api";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const firstName = user?.name.split(" ")[0] ?? "equipo";

  useEffect(() => {
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token) return;

      try {
        setError("");
        setData(await fetchDashboardSummary(token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard.");
      }
    };

    void load();
  }, []);

  const stats = data?.stats ?? {
    appointmentsToday: 0,
    vehiclesInWorkshop: 0,
    activeOrders: 0,
  };

  const summaryText = useMemo(() => {
    if (!data?.recentAppointments.length) {
      return "Todavía no hay turnos cargados para hoy.";
    }
    return `${data.recentAppointments.length} movimientos recientes listos para seguir desde el tablero.`;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in p-6 duration-500 md:p-10">
      <header className="mb-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fbff_54%,#eef4ff_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Operación diaria</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Buenos días, <span className="text-blue-600">{firstName}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Resumen operativo conectado a SQL para arrancar la jornada con una vista clara de turnos, órdenes activas y vehículos en proceso.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
            <p className="font-semibold">Foco del turno</p>
            <p className="mt-1">{summaryText}</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard label="Turnos registrados" value={stats.appointmentsToday} accent="Hoy" tone="blue" />
        <StatCard label="Vehículos en taller" value={stats.vehiclesInWorkshop} accent="En proceso" tone="emerald" />
        <StatCard label="Órdenes activas" value={stats.activeOrders} accent="Seguimiento" tone="amber" />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Próximos turnos</h2>
              <p className="text-sm text-slate-500">Turnos recientes para seguir desde el tablero</p>
            </div>
            <button
              onClick={() => router.push("/turnos")}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Ver tablero
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.recentAppointments ?? []).map((appointment) => (
              <article key={appointment.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {appointment.vehicleLabel} · {appointment.plate}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.time} · {appointment.reason}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {appointment.status}
                </span>
              </article>
            ))}
            {!data?.recentAppointments.length && (
              <div className="p-6 text-sm text-slate-500">Todavía no hay turnos cargados.</div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f4cbd_0%,#1d4ed8_52%,#0f766e_100%)] p-6 text-white shadow-lg">
          <h2 className="text-xl font-bold">Acciones rápidas</h2>
          <p className="mt-2 text-sm text-blue-100">
            Flujos operativos conectados a base de datos para recepción, seguimiento y atención al cliente.
          </p>
          <div className="mt-6 space-y-3">
            <ActionButton label="Registrar ingreso" hint="Alta de cliente, vehículo y turno" onClick={() => router.push("/clientes")} />
            <ActionButton label="Ver tablero" hint="Mover órdenes y actualizar estados" onClick={() => router.push("/turnos")} />
            <ActionButton label="Portal clientes" hint="Consultar la vista que ve el cliente final" onClick={() => router.push("/portal")} />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: number;
  accent: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-4xl font-extrabold text-slate-900">{value}</p>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{accent}</span>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full rounded-[1.4rem] border border-white/10 bg-white/10 p-4 text-left transition hover:bg-white/15">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-sm text-blue-100">{hint}</p>
    </button>
  );
}
