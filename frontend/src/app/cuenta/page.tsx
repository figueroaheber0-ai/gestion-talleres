"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchOwnerAccountStatus, getStoredStaffToken, type OwnerAccountStatus } from "@/lib/auth-api";

const STATUS_LABEL: Record<OwnerAccountStatus["contractStatus"], string> = {
  active: "Activo",
  expiring: "Por vencer",
  expired: "Vencido",
  suspended: "Suspendido",
};

const BILLING_LABEL: Record<OwnerAccountStatus["billingCycle"], string> = {
  monthly: "Mensual",
  semiannual: "Semestral",
  annual: "Anual",
};

export default function CuentaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<OwnerAccountStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token) return;

      try {
        setLoading(true);
        setError("");
        setData(await fetchOwnerAccountStatus(token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el estado de cuenta.");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "owner") {
      void load();
      return;
    }
    setLoading(false);
  }, [user?.role]);

  const renewalDate = useMemo(() => {
    if (!data) return "-";
    return new Date(data.nextRenewalAt).toLocaleDateString("es-AR");
  }, [data]);

  if (user?.role !== "owner") {
    return (
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-amber-300/35 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Esta sección está disponible solo para dueños de taller.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
      <header className="mb-6 rounded-2xl border border-white/12 bg-[linear-gradient(145deg,#2400A2_0%,#190B47_75%)] p-5 text-white shadow-[0_18px_40px_rgba(7,3,24,0.28)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A80]">Cuenta del taller</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Estado de cuenta y plan contratado</h1>
        <p className="mt-2 text-sm text-white/85 sm:text-base">
          Controlá vigencia, capacidad y alcance de tu plan desde un solo lugar.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-white/12 bg-[#2400A2]/15" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 rounded-xl border border-red-300/35 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Plan activo" value={data.effectivePlanLabel} detail={`Ciclo ${BILLING_LABEL[data.billingCycle]}`} />
            <Card label="Estado del contrato" value={STATUS_LABEL[data.contractStatus]} detail={`${data.remainingDays} días restantes`} />
            <Card label="Próxima renovación" value={renewalDate} detail={data.autoRenew ? "Renovación automática" : "Renovación manual"} />
            <Card label="Precio mensual" value={`$${data.monthlyPrice.toLocaleString("es-AR")}`} detail="Referencia de facturación" />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#2400A2]/20 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#190B47]">Uso de capacidad</h2>
              <div className="mt-4 space-y-4">
                <UsageRow
                  label="Usuarios del equipo"
                  current={data.totalUsers}
                  max={data.maxUsers}
                  remaining={data.remainingUsers}
                />
                <UsageRow
                  label="Órdenes activas"
                  current={data.activeOrders}
                  max={data.maxWorkOrders}
                  remaining={data.remainingWorkOrders}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#2400A2]/20 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#190B47]">Incluye tu plan</h2>
              <ul className="mt-4 space-y-2">
                {data.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#1e293b]">
                    <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-[#FFE707]" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-[#2400A2]/20 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#190B47]">Resumen del taller</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Taller" value={data.tenantName} />
              <Info label="Modo de plan" value={data.billingMode === "custom" ? "Personalizado" : "Catálogo"} />
              <Info label="Ingresos registrados" value={`$${data.monthlyRevenue.toLocaleString("es-AR")}`} />
            </div>
            {data.moderationNote ? (
              <div className="mt-4 rounded-xl border border-amber-300/35 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Nota administrativa: {data.moderationNote}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/sesiones")}
              className="mt-5 rounded-lg border border-[#190B47]/20 bg-[#190B47] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2400A2]"
            >
              Ver actividad de sesiones
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Card({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-[#2400A2]/20 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8A80]">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#190B47]">{value}</p>
      <p className="mt-1 text-sm text-[#475569]">{detail}</p>
    </article>
  );
}

function UsageRow({
  label,
  current,
  max,
  remaining,
}: {
  label: string;
  current: number;
  max: number | null;
  remaining: number | null;
}) {
  const percent = max === null || max <= 0 ? 0 : Math.min(100, Math.round((current / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#1e293b]">{label}</span>
        <span className="text-[#475569]">
          {max === null ? `${current} en uso` : `${current} / ${max}`}
        </span>
      </div>
      {max !== null ? (
        <div className="h-2 w-full rounded-full bg-[#e2e8f0]">
          <div
            className="h-2 rounded-full bg-[#2400A2]"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
      <p className="mt-1 text-xs text-[#64748b]">
        {remaining === null ? "Sin límite definido en el plan." : `Te quedan ${remaining} disponibles.`}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A8A80]">{label}</p>
      <p className="mt-1 font-semibold text-[#1e293b]">{value}</p>
    </div>
  );
}
