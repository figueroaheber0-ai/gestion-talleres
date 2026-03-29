"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addPartToWorkOrder,
  createInventoryItem,
  fetchInventoryItems,
  fetchMechanics,
  fetchWorkOrderDetail,
  fetchWorkOrders,
  getStoredStaffToken,
  updateWorkOrder,
  type InventoryItem,
  type MechanicOption,
  type WorkOrderDetailResponse,
  type WorkOrderRow,
} from "@/lib/auth-api";

const estadoConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-gray-100 text-gray-700 border-gray-200" },
  estimating: { label: "En Diagnostico", color: "bg-purple-50 text-purple-700 border-purple-100" },
  waiting_parts: { label: "Esperando Repuestos", color: "bg-amber-50 text-amber-700 border-amber-100" },
  repairing: { label: "En Reparacion", color: "bg-blue-50 text-blue-700 border-blue-100" },
  finished: { label: "Listo", color: "bg-green-50 text-green-700 border-green-100" },
  cancelled: { label: "Cancelado", color: "bg-red-50 text-red-700 border-red-100" },
};

const prioridadConfig: Record<string, { label: string; color: string }> = {
  urgente: { label: "Urgente", color: "text-red-600 font-bold" },
  alta: { label: "Alta", color: "text-orange-600 font-semibold" },
  normal: { label: "Normal", color: "text-gray-500" },
};

const initialOrderForm = {
  diagnostic: "",
  laborCost: "",
  totalCost: "",
  recommendedNextRevisionDate: "",
  recommendedNextRevisionNote: "",
  mechanicId: "",
  clientUpdateTitle: "",
  clientUpdateMessage: "",
};

const initialPartForm = {
  itemId: "",
  quantity: "1",
  unitPrice: "",
  internalCost: "",
  providedByClient: false,
};

const initialInventoryForm = {
  name: "",
  sku: "",
  stockQuantity: "0",
  minAlert: "1",
  price: "",
};

export default function OrdenesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderDetailResponse | null>(null);
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [partForm, setPartForm] = useState(initialPartForm);
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const loadAll = async () => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setError("");
      const [orderRows, inventoryRows, mechanicRows] = await Promise.all([
        fetchWorkOrders(token),
        fetchInventoryItems(token),
        fetchMechanics(token),
      ]);
      setOrders(orderRows);
      setInventory(inventoryRows);
      setMechanics(mechanicRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las ordenes.");
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const openOrder = async (workOrderId: string) => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      const detail = await fetchWorkOrderDetail(token, workOrderId);
      setSelectedOrder(detail);
      setOrderForm({
        diagnostic: detail.diagnostic ?? "",
        laborCost: detail.laborCost ? String(detail.laborCost) : "",
        totalCost: detail.totalCost ? String(detail.totalCost) : "",
        recommendedNextRevisionDate: detail.recommendedNextRevisionDate?.slice(0, 10) ?? "",
        recommendedNextRevisionNote: detail.recommendedNextRevisionNote ?? "",
        mechanicId: detail.mechanicId ?? "",
        clientUpdateTitle: "",
        clientUpdateMessage: "",
      });
      setPartForm(initialPartForm);
      setIsEditorOpen(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo abrir la orden.");
    }
  };

  const handleOrderSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token || !selectedOrder) return;

    try {
      setSaving(true);
      const updated = await updateWorkOrder(token, selectedOrder.id, {
        diagnostic: orderForm.diagnostic || undefined,
        laborCost: orderForm.laborCost ? Number(orderForm.laborCost) : 0,
        totalCost: orderForm.totalCost ? Number(orderForm.totalCost) : 0,
        recommendedNextRevisionDate: orderForm.recommendedNextRevisionDate || null,
        recommendedNextRevisionNote: orderForm.recommendedNextRevisionNote || null,
        mechanicId: orderForm.mechanicId || null,
        clientUpdateTitle: orderForm.clientUpdateTitle || undefined,
        clientUpdateMessage: orderForm.clientUpdateMessage || undefined,
      });
      setSelectedOrder(updated);
      setOrderForm((prev) => ({ ...prev, clientUpdateTitle: "", clientUpdateMessage: "" }));
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la orden.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token || !selectedOrder) return;

    try {
      setSaving(true);
      const updated = await addPartToWorkOrder(token, selectedOrder.id, {
        itemId: partForm.itemId,
        quantity: Number(partForm.quantity),
        unitPrice: Number(partForm.unitPrice),
        internalCost: Number(partForm.internalCost),
        providedByClient: partForm.providedByClient,
      });
      setSelectedOrder(updated);
      setPartForm(initialPartForm);
      await loadAll();
    } catch (partError) {
      setError(partError instanceof Error ? partError.message : "No se pudo agregar el repuesto.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInventory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setSaving(true);
      const item = await createInventoryItem(token, {
        name: inventoryForm.name,
        sku: inventoryForm.sku || undefined,
        stockQuantity: Number(inventoryForm.stockQuantity),
        minAlert: Number(inventoryForm.minAlert),
        price: inventoryForm.price ? Number(inventoryForm.price) : 0,
      });
      setInventoryForm(initialInventoryForm);
      await loadAll();
      setPartForm((prev) => ({
        ...prev,
        itemId: item.id,
        unitPrice: item.price ? String(item.price) : prev.unitPrice,
        internalCost: prev.internalCost || String(item.price || 0),
      }));
    } catch (inventoryError) {
      setError(inventoryError instanceof Error ? inventoryError.message : "No se pudo crear el repuesto.");
    } finally {
      setSaving(false);
    }
  };

  const filtradas =
    filtroEstado === "todos" ? orders : orders.filter((order) => order.estado === filtroEstado);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in p-6 duration-500 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Ordenes de Trabajo</h1>
          <p className="mt-1 font-medium text-gray-500">
            Ordenes editables con repuestos reales, stock e historial de avance para el cliente.
          </p>
        </div>
        <button
          onClick={() => router.push("/turnos")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
        >
          Ir al tablero
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "todos", label: "Todas" },
          { key: "pending", label: "Pendientes" },
          { key: "estimating", label: "Diagnostico" },
          { key: "repairing", label: "En reparacion" },
          { key: "finished", label: "Listas" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(key)}
            className={`rounded-xl border px-4 py-1.5 text-sm font-semibold transition-all ${
              filtroEstado === key
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500">
                <th className="px-6 py-4">OT / Vehiculo</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Mecanico</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Prioridad</th>
                <th className="px-6 py-4">Ingreso</th>
                <th className="px-6 py-4 text-right">Estimado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {filtradas.map((orden) => {
                const estado = estadoConfig[orden.estado] ?? estadoConfig.pending;
                const prioridad = prioridadConfig[orden.prioridad] ?? prioridadConfig.normal;

                return (
                  <tr key={orden.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                          {orden.vehiculo}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold text-gray-500">
                            {orden.patente}
                          </span>
                          <span className="text-xs font-medium text-gray-400">OT-{orden.id.slice(0, 8)}</span>
                        </div>
                        <p className="mt-2 max-w-md text-xs text-gray-500">{orden.motivo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">{orden.cliente}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-xs font-bold text-blue-700">
                          {orden.mecanico.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-600">{orden.mecanico}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${estado.color}`}>
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs ${prioridad.color}`}>{prioridad.label}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(orden.fechaIngreso).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      ${orden.estimado.toLocaleString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => void openOrder(orden.id)}
                          className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-800 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => router.push(`/vehiculos/${orden.vehicleId}`)}
                          className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isEditorOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {selectedOrder.vehicle.brand} {selectedOrder.vehicle.model}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {selectedOrder.vehicle.plate} • {selectedOrder.client.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  X
                </button>
              </div>
            </div>

            <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={handleOrderSave} className="overflow-y-auto border-r border-gray-100 p-6">
                <div className="space-y-6">
                  <label className="block text-sm font-bold text-gray-700">
                    Mecanico responsable
                    <select
                      value={orderForm.mechanicId}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, mechanicId: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
                    >
                      <option value="">Sin asignar</option>
                      {mechanics.map((mechanic) => (
                        <option key={mechanic.id} value={mechanic.id}>
                          {mechanic.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-bold text-gray-700">
                    Diagnostico
                    <textarea
                      rows={5}
                      value={orderForm.diagnostic}
                      onChange={(event) => setOrderForm((prev) => ({ ...prev, diagnostic: event.target.value }))}
                      className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Mano de obra" type="number" value={orderForm.laborCost} onChange={(value) => setOrderForm((prev) => ({ ...prev, laborCost: value }))} />
                    <Input label="Total a cobrar" type="number" value={orderForm.totalCost} onChange={(value) => setOrderForm((prev) => ({ ...prev, totalCost: value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Proxima revision" type="date" value={orderForm.recommendedNextRevisionDate} onChange={(value) => setOrderForm((prev) => ({ ...prev, recommendedNextRevisionDate: value }))} />
                    <Input label="Nota revision" value={orderForm.recommendedNextRevisionNote} onChange={(value) => setOrderForm((prev) => ({ ...prev, recommendedNextRevisionNote: value }))} />
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-900">Actualizar al cliente</p>
                    <div className="mt-3 space-y-3">
                      <Input label="Titulo" value={orderForm.clientUpdateTitle} onChange={(value) => setOrderForm((prev) => ({ ...prev, clientUpdateTitle: value }))} />
                      <label className="block text-sm font-bold text-gray-700">
                        Mensaje
                        <textarea
                          rows={4}
                          value={orderForm.clientUpdateMessage}
                          onChange={(event) => setOrderForm((prev) => ({ ...prev, clientUpdateMessage: event.target.value }))}
                          className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {saving ? "Guardando..." : "Guardar orden"}
                  </button>
                </div>
              </form>

              <div className="overflow-y-auto p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Repuestos aplicados</h3>
                  <div className="mt-3 space-y-3">
                    {selectedOrder.parts.map((part) => (
                      <div key={`${part.itemId}-${part.name}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{part.name}</p>
                            <p className="text-xs text-gray-500">{part.sku ?? "Sin SKU"}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900">x{part.quantity}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          Cobrado ${part.unitPrice.toLocaleString("es-AR")} • costo interno ${part.internalCost.toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}
                    {!selectedOrder.parts.length && <p className="text-sm text-gray-400">Todavia no hay repuestos cargados.</p>}
                  </div>
                </div>

                <form onSubmit={handleAddPart} className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h4 className="mb-3 font-bold text-gray-900">Agregar repuesto</h4>
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700">
                      Item de inventario
                      <select
                        value={partForm.itemId}
                        onChange={(event) => {
                          const item = inventory.find((entry) => entry.id === event.target.value);
                          setPartForm((prev) => ({
                            ...prev,
                            itemId: event.target.value,
                            unitPrice: item?.price ? String(item.price) : prev.unitPrice,
                            internalCost: item?.price ? String(item.price) : prev.internalCost,
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
                      >
                        <option value="">Seleccionar repuesto</option>
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} • stock {item.stockQuantity}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="Cantidad" type="number" value={partForm.quantity} onChange={(value) => setPartForm((prev) => ({ ...prev, quantity: value }))} />
                      <Input label="Precio venta" type="number" value={partForm.unitPrice} onChange={(value) => setPartForm((prev) => ({ ...prev, unitPrice: value }))} />
                      <Input label="Costo interno" type="number" value={partForm.internalCost} onChange={(value) => setPartForm((prev) => ({ ...prev, internalCost: value }))} />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={partForm.providedByClient}
                        onChange={(event) => setPartForm((prev) => ({ ...prev, providedByClient: event.target.checked }))}
                      />
                      Repuesto aportado por el cliente
                    </label>
                    <button
                      type="submit"
                      disabled={saving || !partForm.itemId}
                      className="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-70"
                    >
                      Agregar a la orden
                    </button>
                  </div>
                </form>

                <form onSubmit={handleCreateInventory} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-3 font-bold text-gray-900">Crear repuesto rapido</h4>
                  <div className="space-y-3">
                    <Input label="Nombre" value={inventoryForm.name} onChange={(value) => setInventoryForm((prev) => ({ ...prev, name: value }))} required />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="SKU" value={inventoryForm.sku} onChange={(value) => setInventoryForm((prev) => ({ ...prev, sku: value }))} />
                      <Input label="Stock" type="number" value={inventoryForm.stockQuantity} onChange={(value) => setInventoryForm((prev) => ({ ...prev, stockQuantity: value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Minimo" type="number" value={inventoryForm.minAlert} onChange={(value) => setInventoryForm((prev) => ({ ...prev, minAlert: value }))} />
                      <Input label="Precio base" type="number" value={inventoryForm.price} onChange={(value) => setInventoryForm((prev) => ({ ...prev, price: value }))} />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-xl bg-gray-900 py-2.5 font-bold text-white transition hover:bg-gray-800 disabled:opacity-70"
                    >
                      Crear item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}
