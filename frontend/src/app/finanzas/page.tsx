"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchFinanceSummary,
  getStoredStaffToken,
  type FinanceSummaryResponse,
} from "@/lib/auth-api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "dia" | "semana" | "mes" | "anio";

export default function FinanzasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Period>("semana");
  const [data, setData] = useState<FinanceSummaryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token || !user || user.role !== "owner") return;

      try {
        setError("");
        setData(await fetchFinanceSummary(token, periodo));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las finanzas.");
      }
    };

    void load();
  }, [periodo, user]);

  if (!user || user.role !== "owner") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-medium text-gray-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary ?? { ingresos: 0, costos: 0, ganancia: 0 };
  const trend =
    summary.ingresos > 0
      ? Math.round((summary.ganancia / summary.ingresos) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in p-6 duration-500 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Finanzas y Rendimiento</h1>
          <p className="mt-1 font-medium text-gray-500">
            Analisis real de ingresos, costos y productividad del taller.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          {(["dia", "semana", "mes", "anio"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                periodo === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard label={`Ingresos (${periodo})`} value={summary.ingresos} accent={`Margen ${trend}%`} accentClass="text-green-600 bg-green-50" />
        <MetricCard label="Costos internos" value={summary.costos} accent={`Ratio ${summary.ingresos ? Math.round((summary.costos / summary.ingresos) * 100) : 0}%`} accentClass="text-red-600 bg-red-50" />
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-md">
          <p className="mb-2 text-sm font-medium text-green-100">Ganancia neta</p>
          <h2 className="text-3xl font-extrabold">${summary.ganancia.toLocaleString("es-AR")}</h2>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Ingresos vs costos
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.timeline ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f9fafb" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ganancia" name="Ganancia" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Productividad
          </h3>
          <p className="mb-4 text-sm text-gray-500">Facturacion generada por cada mecanico.</p>

          <div className="relative flex-1">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.byMechanic ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {(data?.byMechanic ?? []).map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-medium text-gray-400">Total</span>
              <span className="text-xl font-bold text-gray-900">
                ${summary.ingresos.toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {(data?.byMechanic ?? []).map((emp) => (
              <div key={emp.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: emp.color }} />
                  <span className="font-medium text-gray-700">{emp.name}</span>
                </div>
                <span className="font-bold text-gray-900">${emp.value.toLocaleString("es-AR")}</span>
              </div>
            ))}
            {!data?.byMechanic.length && <p className="text-sm text-gray-400">Todavia no hay ordenes en este periodo.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
  accentClass,
}: {
  label: string;
  value: number;
  accent: string;
  accentClass: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-2 text-sm font-medium text-gray-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <h2 className="text-3xl font-extrabold text-gray-900">${value.toLocaleString("es-AR")}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${accentClass}`}>{accent}</span>
      </div>
    </div>
  );
}
