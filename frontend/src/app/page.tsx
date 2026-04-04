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
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el tablero.");
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
    return `${data.recentAppointments.length} movimientos recientes listos para seguimiento.`;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
      <header className="mb-6 overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(145deg,#2400A2_0%,#190B47_70%)] p-5 shadow-[0_18px_40px_rgba(7,3,24,0.35)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A8A80]">Operación diaria</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
          Bienvenido, <span className="text-[#FFE707]">{firstName}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
          Controla el estado del taller, los turnos y las órdenes activas desde una única vista clara.
        </p>
        <div className="mt-4 rounded-xl border border-[#474211]/60 bg-[#474211]/20 px-4 py-3 text-sm text-white/90">
          {summaryText}
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-300/35 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Turnos de hoy" value={stats.appointmentsToday} accent="Agenda" />
        <StatCard label="Vehículos en taller" value={stats.vehiclesInWorkshop} accent="En proceso" />
        <StatCard label="Órdenes activas" value={stats.activeOrders} accent="Seguimiento" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/12 bg-[#2400A2]/80 shadow-[0_18px_38px_rgba(7,3,24,0.26)]">
          <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-white">Próximos turnos</h2>
              <p className="text-sm text-[#8A8A80]">Últimos movimientos de la agenda</p>
            </div>
            <button
              onClick={() => router.push("/turnos")}
              className="rounded-lg bg-[#FFE707] px-3 py-2 text-sm font-semibold text-[#190B47] transition hover:brightness-95"
            >
              Ver turnos
            </button>
          </div>

          <div className="divide-y divide-white/10">
            {(data?.recentAppointments ?? []).map((appointment) => (
              <article key={appointment.id} className="p-4 sm:p-5">
                <h3 className="font-semibold text-white">
                  {appointment.vehicleLabel} · {appointment.plate}
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  {appointment.time} · {appointment.reason}
                </p>
                <span className="mt-3 inline-flex rounded-full border border-[#8A8A80]/45 bg-[#190B47]/50 px-3 py-1 text-xs font-semibold text-white">
                  {appointment.status}
                </span>
              </article>
            ))}
            {!data?.recentAppointments.length ? (
              <div className="p-4 text-sm text-[#8A8A80] sm:p-5">Todavía no hay turnos cargados.</div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/12 bg-[#2400A2]/80 p-4 shadow-[0_18px_38px_rgba(7,3,24,0.26)] sm:p-5">
          <h2 className="text-lg font-bold text-white">Acciones rápidas</h2>
          <p className="mt-2 text-sm text-[#8A8A80]">Tareas frecuentes para la operación diaria.</p>
          <div className="mt-4 space-y-3">
            <ActionButton
              label="Registrar ingreso"
              hint="Alta de cliente, vehículo y turno"
              onClick={() => router.push("/clientes")}
            />
            <ActionButton
              label="Gestionar órdenes"
              hint="Actualizar estado y diagnóstico"
              onClick={() => router.push("/ordenes")}
            />
            <ActionButton
              label="Portal clientes"
              hint="Ver experiencia del cliente final"
              onClick={() => router.push("/portal")}
            />
            {user?.role === "owner" ? (
              <ActionButton
                label="Estado de cuenta"
                hint="Plan contratado, vigencia y capacidad"
                onClick={() => router.push("/cuenta")}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[#2400A2]/80 p-4 shadow-[0_12px_30px_rgba(7,3,24,0.20)] sm:p-5">
      <p className="text-sm font-medium text-[#8A8A80]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold text-white">{value}</p>
        <span className="rounded-full bg-[#FFE707] px-3 py-1 text-xs font-semibold text-[#190B47]">{accent}</span>
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
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-white/12 bg-[#190B47]/65 p-4 text-left transition hover:border-[#FFE707]/55 hover:bg-[#190B47]"
    >
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm text-[#8A8A80]">{hint}</p>
    </button>
  );
}
