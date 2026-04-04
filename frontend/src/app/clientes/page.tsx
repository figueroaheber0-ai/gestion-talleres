"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createIntake,
  fetchClients,
  getStoredStaffToken,
  type ClientRow,
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

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadClients = async (search?: string) => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setClients(await fetchClients(token, search));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar clientes.");
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const handleCreate = async () => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const result = await createIntake(token, {
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
      setSuccess("Ingreso registrado correctamente.");
      setForm(initialForm);
      setIsSlideOpen(false);
      await loadClients(searchTerm);
      router.push(`/vehiculos/${result.vehicleId}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo registrar el ingreso.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Clientes del taller</h1>
          <p className="mt-1 font-medium text-gray-500">Listado real de clientes y vehiculos guardados en SQL.</p>
        </div>

        <button
          onClick={() => setIsSlideOpen(true)}
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
        >
          Registrar ingreso
        </button>
      </div>

      {(error || success) && (
        <div
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
            error ? "border border-red-200 bg-red-50 text-red-700" : "border border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <input
          type="text"
          placeholder="Buscar por nombre, patente o telefono..."
          className="w-full border-none bg-transparent px-4 py-2 font-medium text-gray-700 placeholder-gray-400 focus:outline-none"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button
          onClick={() => void loadClients(searchTerm)}
          className="rounded-xl bg-gray-50 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100"
        >
          Filtrar
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Vehiculos</th>
                <th className="px-6 py-4">Ultima orden</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {clients.map((client) => (
                <tr key={client.id} className="group hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-gradient-to-tr from-blue-100 to-blue-50 font-bold text-blue-700">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-blue-600">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.phone ?? client.email ?? "Sin contacto"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {client.vehicles.map((vehicle) => (
                        <button
                          key={vehicle.id}
                          onClick={() => router.push(`/vehiculos/${vehicle.id}`)}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          {vehicle.plate} <span className="font-normal text-gray-400">({vehicle.brand} {vehicle.model})</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {client.vehicles[0]?.workOrders[0]?.createdAt
                      ? new Date(client.vehicles[0].workOrders[0].createdAt).toLocaleDateString("es-AR")
                      : "Sin ordenes"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {client.vehicles[0] && (
                      <button
                        onClick={() => router.push(`/vehiculos/${client.vehicles[0].id}`)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Ver detalle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isSlideOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm" onClick={() => setIsSlideOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-extrabold text-gray-900">Nuevo ingreso</h2>
              <button onClick={() => setIsSlideOpen(false)} className="rounded-full bg-gray-50 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                X
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {[
                ["clientName", "Nombre del cliente"],
                ["phone", "Telefono"],
                ["email", "Email"],
                ["plate", "Patente"],
                ["brand", "Marca"],
                ["model", "Modelo"],
                ["year", "Año"],
                ["reason", "Motivo del turno"],
                ["date", "Fecha"],
                ["time", "Hora"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-bold text-gray-700">{label}</label>
                  {key === "reason" ? (
                    <textarea
                      rows={3}
                      value={form.reason}
                      onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  ) : (
                    <input
                      type={key === "date" ? "date" : key === "time" ? "time" : key === "year" ? "number" : "text"}
                      value={form[key as keyof typeof form]}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 p-6">
              <button
                onClick={() => void handleCreate()}
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Crear vehiculo y turno"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
