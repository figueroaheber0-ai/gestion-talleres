"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  createIntake,
  fetchAppointmentsBoard,
  fetchMechanics,
  fetchWorkOrderDetail,
  getStoredStaffToken,
  moveBoardItem,
  updateWorkOrder,
  type AppointmentBoardColumn,
  type BoardColumnId,
  type MechanicOption,
  type WorkOrderDetailResponse,
} from "@/lib/auth-api";

const initialForm = {
  clientName: "",
  phone: "",
  email: "",
  plate: "",
  brand: "",
  model: "",
  year: "",
  reason: "",
  date: "",
  time: "",
};

const initialEditor = {
  diagnostic: "",
  laborCost: "",
  totalCost: "",
  recommendedNextRevisionDate: "",
  recommendedNextRevisionNote: "",
  mechanicId: "",
  clientUpdateTitle: "",
  clientUpdateMessage: "",
};

export default function TurnosPage() {
  const [board, setBoard] = useState<AppointmentBoardColumn[]>([]);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderDetailResponse | null>(null);
  const [editor, setEditor] = useState(initialEditor);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    itemId: string;
    sourceColumn: BoardColumnId;
  } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BoardColumnId | null>(null);
  const [form, setForm] = useState(initialForm);

  const loadBoard = async () => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setError("");
      setBoard(await fetchAppointmentsBoard(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el tablero.");
    }
  };

  const loadMechanics = async () => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setMechanics(await fetchMechanics(token));
    } catch {
      setMechanics([]);
    }
  };

  useEffect(() => {
    void loadBoard();
    void loadMechanics();
  }, []);

  const handleMove = async (
    itemId: string,
    sourceColumn: BoardColumnId,
    targetColumn: Exclude<BoardColumnId, "agendados">,
  ) => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setMovingId(itemId);
      setError("");
      await moveBoardItem(token, {
        itemId,
        sourceColumn,
        targetColumn,
      });
      await loadBoard();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "No se pudo mover el vehiculo.");
    } finally {
      setMovingId(null);
      setDragOverColumn(null);
      setDragging(null);
    }
  };

  const openEditor = async (workOrderId: string) => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setEditingId(workOrderId);
      setError("");
      const detail = await fetchWorkOrderDetail(token, workOrderId);
      setSelectedOrder(detail);
      setEditor({
        diagnostic: detail.diagnostic ?? "",
        laborCost: detail.laborCost ? String(detail.laborCost) : "",
        totalCost: detail.totalCost ? String(detail.totalCost) : "",
        recommendedNextRevisionDate: detail.recommendedNextRevisionDate
          ? detail.recommendedNextRevisionDate.slice(0, 10)
          : "",
        recommendedNextRevisionNote: detail.recommendedNextRevisionNote ?? "",
        mechanicId: detail.mechanicId ?? "",
        clientUpdateTitle: "",
        clientUpdateMessage: "",
      });
      setIsEditorOpen(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo abrir la orden.");
    } finally {
      setEditingId(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setSaving(true);
      setError("");
      await createIntake(token, {
        clientName: form.clientName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        plate: form.plate,
        brand: form.brand,
        model: form.model,
        year: form.year ? Number(form.year) : undefined,
        reason: form.reason,
        date: form.date,
        time: form.time,
      });
      setForm(initialForm);
      setIsModalOpen(false);
      await loadBoard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el turno.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token || !selectedOrder) return;

    try {
      setSaving(true);
      setError("");
      const updated = await updateWorkOrder(token, selectedOrder.id, {
        diagnostic: editor.diagnostic || undefined,
        laborCost: editor.laborCost ? Number(editor.laborCost) : 0,
        totalCost: editor.totalCost ? Number(editor.totalCost) : 0,
        recommendedNextRevisionDate: editor.recommendedNextRevisionDate || null,
        recommendedNextRevisionNote: editor.recommendedNextRevisionNote || null,
        mechanicId: editor.mechanicId || null,
        clientUpdateTitle: editor.clientUpdateTitle || undefined,
        clientUpdateMessage: editor.clientUpdateMessage || undefined,
      });
      setSelectedOrder(updated);
      setEditor((prev) => ({
        ...prev,
        clientUpdateTitle: "",
        clientUpdateMessage: "",
      }));
      await loadBoard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la orden.");
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (targetColumn: BoardColumnId) => {
    if (!dragging || targetColumn === "agendados") {
      setDragOverColumn(null);
      setDragging(null);
      return;
    }

    const allowedTargets = getAvailableTargets(dragging.sourceColumn).map((target) => target.id);
    if (!allowedTargets.includes(targetColumn)) {
      setDragOverColumn(null);
      setDragging(null);
      return;
    }

    await handleMove(dragging.itemId, dragging.sourceColumn, targetColumn);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1450px] flex-col animate-in fade-in p-6 duration-500 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Tablero de Taller</h1>
          <p className="mt-1 font-medium text-gray-500">
            Arrastra tarjetas entre columnas, edita ordenes y registra avances sin salir del tablero.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
        >
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Turno
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Arrastrar y soltar ya está activo. Desde una tarjeta de orden también podés editar mecánico, diagnóstico, costos y la actualización visible para el cliente.
      </div>

      <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
        {board.map((column) => (
          <div key={column.id} className="flex min-w-[320px] max-w-[320px] flex-shrink-0 flex-col">
            <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${column.color}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
              <h2 className="whitespace-nowrap font-bold">{column.title}</h2>
              <span className="ml-auto rounded-md border border-current/10 bg-white/60 px-2 py-0.5 text-xs font-bold text-current">
                {column.count}
              </span>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverColumn(column.id as BoardColumnId);
              }}
              onDragLeave={() => setDragOverColumn((current) => (current === column.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                void handleDrop(column.id as BoardColumnId);
              }}
              className={`flex flex-1 flex-col gap-4 rounded-2xl border border-dashed p-2 transition ${
                dragOverColumn === column.id
                  ? "border-blue-300 bg-blue-50/60"
                  : "border-gray-100 bg-gray-50/50"
              }`}
            >
              {column.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() =>
                    setDragging({
                      itemId: item.id,
                      sourceColumn: column.id as BoardColumnId,
                    })
                  }
                  onDragEnd={() => {
                    setDragging(null);
                    setDragOverColumn(null);
                  }}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  {item.urgent && (
                    <div className="absolute right-0 top-0 overflow-hidden">
                      <div className="bg-red-500 px-3 py-1 text-[10px] font-bold text-white">Urgente</div>
                    </div>
                  )}

                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-gray-800">
                      {item.plate}
                    </span>
                    <span className="text-xs font-medium text-gray-400">
                      {new Date(item.scheduledFor).toLocaleDateString("es-AR")}
                      {item.time ? ` • ${item.time}` : ""}
                    </span>
                  </div>

                  <div>
                    <p className="mb-0.5 text-lg font-extrabold text-gray-900">{item.model}</p>
                    <p className="text-sm font-medium text-gray-500">{item.client}</p>
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">
                    {item.reason}
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-[10px] font-bold text-blue-700">
                      {item.assigned !== "Sin asignar" ? item.assigned.charAt(0) : "?"}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        item.assigned === "Sin asignar" ? "italic text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {item.assigned}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {getAvailableTargets(column.id as BoardColumnId).map((target) => (
                      <button
                        key={`${item.id}-${target.id}`}
                        type="button"
                        disabled={movingId === item.id}
                        onClick={() =>
                          void handleMove(item.id, column.id as BoardColumnId, target.id)
                        }
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {movingId === item.id ? "Moviendo..." : target.label}
                      </button>
                    ))}

                    {item.itemType === "workOrder" && (
                      <button
                        type="button"
                        disabled={editingId === item.id}
                        onClick={() => void openEditor(item.id)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {editingId === item.id ? "Abriendo..." : "Editar orden"}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {column.items.length === 0 && (
                <div className="flex flex-1 items-center justify-center p-6 text-sm font-medium italic text-gray-400">
                  Sin vehiculos en esta etapa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-md min-h-0 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-extrabold text-gray-900">Nuevo Turno</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain p-6">
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-600">1</div>
                    <h3 className="text-lg font-bold text-gray-900">Datos del Vehiculo</h3>
                  </div>
                  <div className="space-y-4">
                    <Input label="Patente" value={form.plate} onChange={(value) => setForm((prev) => ({ ...prev, plate: value.toUpperCase() }))} required />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Marca" value={form.brand} onChange={(value) => setForm((prev) => ({ ...prev, brand: value }))} required />
                      <Input label="Modelo" value={form.model} onChange={(value) => setForm((prev) => ({ ...prev, model: value }))} required />
                    </div>
                    <Input label="Año" type="number" value={form.year} onChange={(value) => setForm((prev) => ({ ...prev, year: value }))} />
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 font-bold text-purple-600">2</div>
                    <h3 className="text-lg font-bold text-gray-900">Motivo del Turno</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700">
                      Descripcion del problema
                      <textarea
                        rows={3}
                        value={form.reason}
                        onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                        required
                        className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Fecha" type="date" value={form.date} onChange={(value) => setForm((prev) => ({ ...prev, date: value }))} required />
                      <Input label="Hora" type="time" value={form.time} onChange={(value) => setForm((prev) => ({ ...prev, time: value }))} required />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-600">3</div>
                    <h3 className="text-lg font-bold text-gray-900">Cliente</h3>
                  </div>
                  <div className="space-y-4">
                    <Input label="Nombre completo" value={form.clientName} onChange={(value) => setForm((prev) => ({ ...prev, clientName: value }))} required />
                    <Input label="Telefono" type="tel" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
                    <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
                  </div>
                </section>
              </div>

              <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-700 transition hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Guardando..." : "Crear Turno"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {isEditorOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-xl min-h-0 flex-col bg-white shadow-2xl">
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
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleEditorSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain p-6">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Turno asociado</p>
                  <p className="mt-1">
                    {selectedOrder.appointment
                      ? `${selectedOrder.appointment.reason} • ${new Date(selectedOrder.appointment.date).toLocaleDateString("es-AR")} ${selectedOrder.appointment.time}`
                      : "Orden creada directamente en taller"}
                  </p>
                </div>

                <label className="block text-sm font-bold text-gray-700">
                  Mecanico responsable
                  <select
                    value={editor.mechanicId}
                    onChange={(event) => setEditor((prev) => ({ ...prev, mechanicId: event.target.value }))}
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
                    value={editor.diagnostic}
                    onChange={(event) => setEditor((prev) => ({ ...prev, diagnostic: event.target.value }))}
                    className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Costo mano de obra" type="number" value={editor.laborCost} onChange={(value) => setEditor((prev) => ({ ...prev, laborCost: value }))} />
                  <Input label="Total a cobrar" type="number" value={editor.totalCost} onChange={(value) => setEditor((prev) => ({ ...prev, totalCost: value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Proxima revision"
                    type="date"
                    value={editor.recommendedNextRevisionDate}
                    onChange={(value) =>
                      setEditor((prev) => ({ ...prev, recommendedNextRevisionDate: value }))
                    }
                  />
                  <Input
                    label="Nota de revision"
                    value={editor.recommendedNextRevisionNote}
                    onChange={(value) =>
                      setEditor((prev) => ({ ...prev, recommendedNextRevisionNote: value }))
                    }
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-900">Actualizacion para cliente</p>
                  <div className="mt-3 space-y-3">
                    <Input
                      label="Titulo"
                      value={editor.clientUpdateTitle}
                      onChange={(value) => setEditor((prev) => ({ ...prev, clientUpdateTitle: value }))}
                    />
                    <label className="block text-sm font-bold text-gray-700">
                      Mensaje
                      <textarea
                        rows={4}
                        value={editor.clientUpdateMessage}
                        onChange={(event) =>
                          setEditor((prev) => ({ ...prev, clientUpdateMessage: event.target.value }))
                        }
                        className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500"
                      />
                    </label>
                  </div>
                </div>

                {!!selectedOrder.updates.length && (
                  <div>
                    <p className="mb-3 text-sm font-bold text-gray-900">Historial de actualizaciones</p>
                    <div className="space-y-3">
                      {selectedOrder.updates.map((update) => (
                        <div key={update.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-gray-900">{update.title}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(update.createdAt).toLocaleDateString("es-AR")}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{update.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-700 transition hover:bg-gray-200"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function getAvailableTargets(columnId: BoardColumnId) {
  if (columnId === "agendados") {
    return [
      { id: "diagnostico" as const, label: "Ingresar a diagnostico" },
      { id: "reparacion" as const, label: "Pasar a reparacion" },
      { id: "listos" as const, label: "Marcar listo" },
    ];
  }

  if (columnId === "diagnostico") {
    return [
      { id: "reparacion" as const, label: "Mover a reparacion" },
      { id: "listos" as const, label: "Marcar listo" },
    ];
  }

  if (columnId === "reparacion") {
    return [{ id: "listos" as const, label: "Marcar listo" }];
  }

  return [{ id: "diagnostico" as const, label: "Reabrir diagnostico" }];
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
