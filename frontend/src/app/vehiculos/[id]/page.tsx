"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchVehicleHistory, getStoredStaffToken, type VehicleHistoryResponse } from "@/lib/auth-api";

export default function VehicleHistoryPage() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<VehicleHistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token || !params?.id) return;

      try {
        setVehicle(await fetchVehicleHistory(token, params.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
      }
    };

    void load();
  }, [params?.id]);

  if (error) {
    return <div className="p-10 text-red-600">{error}</div>;
  }

  if (!vehicle) {
    return <div className="p-10 text-gray-500">Cargando historial...</div>;
  }

  const lastOrder = vehicle.workOrders[0];

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in p-6 duration-500 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              {vehicle.brand} {vehicle.model}
            </h1>
            <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-sm font-bold text-gray-700">
              {vehicle.plate}
            </span>
          </div>
          <p className="font-medium text-gray-500">
            Cliente: <span className="font-semibold text-blue-600">{vehicle.client.name}</span> • {vehicle.year ?? "s/d"}
          </p>
        </div>
      </div>

      {lastOrder?.recommendedNextRevisionNote && (
        <div className="mb-8 rounded-r-xl border-l-4 border-orange-500 bg-orange-50 p-4 shadow-sm">
          <h3 className="font-bold text-orange-900">Revision recomendada</h3>
          <p className="mt-1 text-sm text-orange-800">{lastOrder.recommendedNextRevisionNote}</p>
        </div>
      )}

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Total ordenes</p>
          <p className="text-2xl font-bold text-gray-900">{vehicle.workOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Ultima visita</p>
          <p className="text-lg font-bold text-gray-900">
            {lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString("es-AR") : "Sin visitas"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Gasto historico</p>
          <p className="text-lg font-bold text-green-600">
            ${vehicle.workOrders.reduce((total, order) => total + order.totalCost, 0).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Estado actual</p>
          <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {lastOrder?.status ?? "Sin orden"}
          </span>
        </div>
      </div>

      <h2 className="mb-6 text-xl font-bold text-gray-900">Historial de servicio</h2>
      <div className="space-y-6">
        {vehicle.workOrders.map((order) => (
          <div key={order.id} className="card-hover relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Orden #{order.id.slice(0, 8)}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString("es-AR")} • Mecanico: {order.mechanic?.name ?? "Sin asignar"}
                </p>
              </div>
              <div className="text-right">
                <span className="mb-2 inline-block rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                  {order.status}
                </span>
                <p className="font-bold text-gray-900">${order.totalCost.toLocaleString("es-AR")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <span className="mb-1 block font-semibold text-gray-900">Diagnostico</span>
                {order.diagnostic ?? "Sin diagnostico registrado."}
              </div>

              {!!order.parts.length && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Repuestos</span>
                  <div className="space-y-2">
                    {order.parts.map((part, index) => (
                      <div key={`${order.id}-${index}`} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-medium text-gray-700">{part.item.name}</span>
                        <span className="text-xs text-gray-500">
                          Cantidad {part.quantity} • Cobrado ${part.unitPrice.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!order.updates.length && (
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Actualizaciones al cliente</span>
                  {order.updates.map((update) => (
                    <div key={update.id} className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-blue-900">{update.title}</h4>
                        <span className="text-xs text-blue-700">
                          {new Date(update.createdAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      <p className="text-sm text-blue-900">{update.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
