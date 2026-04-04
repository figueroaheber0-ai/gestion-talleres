import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(30,41,59,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">Demo 81cc</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Solicita una demo personalizada</h1>
        <p className="mt-3 text-slate-600">
          Estamos preparando una experiencia guiada para mostrarte como 81cc organiza turnos, inventario y facturacion en tu taller.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Volver al login
          </Link>
          <Link
            href="/portal"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver portal cliente
          </Link>
        </div>
      </div>
    </main>
  );
}
