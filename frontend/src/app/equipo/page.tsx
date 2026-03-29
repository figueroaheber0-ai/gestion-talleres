"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  createStaffInvite,
  fetchStaffInvites,
  fetchStaffMembers,
  getStoredStaffToken,
  type StaffInvite,
  type StaffMember,
} from "@/lib/auth-api";

const initialInvite = {
  name: "",
  email: "",
  role: "employee" as "employee" | "superadmin",
};

export default function EquipoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [inviteForm, setInviteForm] = useState(initialInvite);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setMembers(await fetchStaffMembers(token));
      setInvites(await fetchStaffInvites(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el equipo.");
    }
  };

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.replace("/");
      return;
    }

    void load();
  }, [router, user]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token) return;

    try {
      setSaving(true);
      setError("");
      const result = await createStaffInvite(token, inviteForm);
      const inviteLink = `${window.location.origin}/registro-equipo?token=${encodeURIComponent(result.inviteToken)}`;
      setLastInviteLink(inviteLink);
      setInviteForm(initialInvite);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "No se pudo crear la invitacion.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "owner") {
    return <div className="p-10 text-gray-500">Redirigiendo...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in p-6 duration-500 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Equipo y Accesos</h1>
        <p className="mt-1 font-medium text-gray-500">
          Altas seguras por invitacion dentro de 81cc. Un mismo mecanico puede trabajar en dos talleres usando la misma casilla y eligiendo taller al iniciar sesion.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mb-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Personal activo</h2>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Invitar mecanico</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <Input label="Nombre" value={inviteForm.name} onChange={(value) => setInviteForm((prev) => ({ ...prev, name: value }))} required />
            <Input label="Email" type="email" value={inviteForm.email} onChange={(value) => setInviteForm((prev) => ({ ...prev, email: value }))} required />
            <label className="block text-sm font-bold text-gray-700">
              Rol
              <select
                value={inviteForm.role}
                onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value as "employee" | "superadmin" }))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="employee">Empleado / Mecanico</option>
                <option value="superadmin">Soporte avanzado</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? "Enviando..." : "Generar invitacion segura"}
            </button>
          </form>

          {lastInviteLink && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Invitacion creada</p>
              <p className="mt-1 break-all">{lastInviteLink}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Invitaciones del taller</h2>
        <div className="space-y-3">
          {invites.map((invite) => (
            <div key={invite.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {invite.name} • {invite.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    Invitado por {invite.invitedByName} • vence {new Date(invite.expiresAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  {invite.status}
                </span>
              </div>
            </div>
          ))}
          {!invites.length && <p className="text-sm text-gray-400">Todavia no hay invitaciones creadas.</p>}
        </div>
      </div>
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
