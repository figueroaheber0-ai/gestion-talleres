"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type SimStage = "recepcion" | "diagnostico" | "reparacion" | "calidad" | "entrega";
type SimTone = "sky" | "amber" | "emerald" | "rose";

type SimUnit = {
  id: string;
  client: string;
  vehicle: string;
  plate: string;
  stage: SimStage;
  progress: number;
  eta: string;
  priority: "normal" | "urgente";
};

type SimEvent = {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: SimTone;
};

type ScenarioPreset = {
  id: string;
  name: string;
  description: string;
  speed: 1 | 2 | 4;
  units: SimUnit[];
  seedEvent: string;
};

const stageOrder: SimStage[] = ["recepcion", "diagnostico", "reparacion", "calidad", "entrega"];
const stageLabel: Record<SimStage, string> = {
  recepcion: "Recepción",
  diagnostico: "Diagnóstico",
  reparacion: "Reparación",
  calidad: "Control de calidad",
  entrega: "Entrega",
};

const presets: ScenarioPreset[] = [
  {
    id: "tranquilo",
    name: "Mañana tranquila",
    description: "Pocos vehículos, ritmo estable y sin cuellos de botella.",
    speed: 2,
    seedEvent: "Escenario cargado: mañana tranquila.",
    units: [
      { id: "u1", client: "Julia Torres", vehicle: "Amarok V6", plate: "AE123RT", stage: "recepcion", progress: 18, eta: "09:40", priority: "normal" },
      { id: "u2", client: "Carlos Méndez", vehicle: "Hilux SRX", plate: "AD998LK", stage: "diagnostico", progress: 42, eta: "10:15", priority: "normal" },
      { id: "u3", client: "Florencia Arias", vehicle: "208 GT", plate: "AF332QT", stage: "reparacion", progress: 67, eta: "11:10", priority: "normal" },
      { id: "u4", client: "Nicolás Sosa", vehicle: "Ranger LTD", plate: "AC551MN", stage: "calidad", progress: 82, eta: "11:45", priority: "urgente" },
    ],
  },
  {
    id: "saturado",
    name: "Taller saturado",
    description: "Demasiadas unidades entrando juntas y presión sobre recepción y reparación.",
    speed: 1,
    seedEvent: "Escenario cargado: taller saturado.",
    units: [
      { id: "u1", client: "Pedro Rivas", vehicle: "Cronos", plate: "AF777AA", stage: "recepcion", progress: 20, eta: "09:20", priority: "urgente" },
      { id: "u2", client: "María López", vehicle: "Partner", plate: "AE121CD", stage: "recepcion", progress: 30, eta: "09:30", priority: "normal" },
      { id: "u3", client: "Sofía Díaz", vehicle: "Kangoo", plate: "AB765TR", stage: "diagnostico", progress: 22, eta: "10:20", priority: "urgente" },
      { id: "u4", client: "Bruno Vega", vehicle: "S10", plate: "AC889KL", stage: "reparacion", progress: 48, eta: "11:50", priority: "normal" },
      { id: "u5", client: "Paula Rosas", vehicle: "Berlingo", plate: "AF550RM", stage: "reparacion", progress: 39, eta: "12:10", priority: "normal" },
      { id: "u6", client: "Matías Gallo", vehicle: "Toro", plate: "AE003QW", stage: "calidad", progress: 74, eta: "12:40", priority: "urgente" },
    ],
  },
  {
    id: "cuello-diagnostico",
    name: "Cuello en diagnóstico",
    description: "Muchas unidades trabadas en revisión inicial.",
    speed: 2,
    seedEvent: "Escenario cargado: cuello de botella en diagnóstico.",
    units: [
      { id: "u1", client: "Micaela Ponce", vehicle: "C3 Aircross", plate: "AF110ZA", stage: "diagnostico", progress: 18, eta: "09:55", priority: "normal" },
      { id: "u2", client: "Ricardo Pérez", vehicle: "Frontier", plate: "AD420LM", stage: "diagnostico", progress: 24, eta: "10:05", priority: "urgente" },
      { id: "u3", client: "Daniela Mora", vehicle: "Gol Trend", plate: "AB228TY", stage: "diagnostico", progress: 29, eta: "10:20", priority: "normal" },
      { id: "u4", client: "Esteban Ruiz", vehicle: "308", plate: "AC783QP", stage: "reparacion", progress: 58, eta: "11:15", priority: "normal" },
      { id: "u5", client: "Cintia León", vehicle: "Ranger", plate: "AE710DS", stage: "recepcion", progress: 14, eta: "09:35", priority: "urgente" },
    ],
  },
  {
    id: "urgencias",
    name: "Dos urgencias juntas",
    description: "Entradas simultáneas de alta prioridad que alteran la cola.",
    speed: 4,
    seedEvent: "Escenario cargado: dos urgencias al mismo tiempo.",
    units: [
      { id: "u1", client: "Sandra Ferreyra", vehicle: "Hilux DX", plate: "AF901PQ", stage: "recepcion", progress: 26, eta: "09:10", priority: "urgente" },
      { id: "u2", client: "Iván Quiroga", vehicle: "Transit", plate: "AE010XY", stage: "recepcion", progress: 28, eta: "09:12", priority: "urgente" },
      { id: "u3", client: "Luciana Rey", vehicle: "208 Like", plate: "AD535AZ", stage: "diagnostico", progress: 46, eta: "10:00", priority: "normal" },
      { id: "u4", client: "Ramiro Costa", vehicle: "Raptor", plate: "AF444TR", stage: "reparacion", progress: 63, eta: "10:40", priority: "normal" },
    ],
  },
];

function buildInitialEvent(message: string): SimEvent[] {
  return [
    {
      id: "e1",
      time: "09:00",
      title: "Laboratorio listo",
      detail: message,
      tone: "sky",
    },
  ];
}

export default function LaboratorioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState(presets[0].id);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(presets[0].speed);
  const [units, setUnits] = useState<SimUnit[]>(presets[0].units);
  const [events, setEvents] = useState<SimEvent[]>(buildInitialEvent(presets[0].seedEvent));
  const eventCounter = useRef(2);

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (user.role !== "superadmin") router.replace("/");
  }, [router, user]);

  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      startTransition(() => {
        setUnits((current) => {
          const next = current.map((unit, index) => {
            const delta = (index % 2 === 0 ? 9 : 6) * speed;
            const progressed = Math.min(100, unit.progress + delta);
            const stageIndex = stageOrder.indexOf(unit.stage);
            const shouldAdvance = progressed >= 100 && stageIndex < stageOrder.length - 1;
            const stage = shouldAdvance ? stageOrder[stageIndex + 1] : unit.stage;
            const progress = shouldAdvance ? 8 : progressed;
            return { ...unit, stage, progress };
          });

          const moved = next.find((unit, idx) => unit.stage !== current[idx].stage);
          if (moved) {
            const tone: SimTone =
              moved.stage === "entrega" ? "emerald" : moved.priority === "urgente" ? "amber" : "sky";
            setEvents((prev) => [
              {
                id: `e${eventCounter.current++}`,
                time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
                title: `${moved.vehicle} avanzó`,
                detail: `${moved.client} pasó a ${stageLabel[moved.stage]}.`,
                tone,
              },
              ...prev,
            ].slice(0, 12));
          }

          return next;
        });
      });
    }, 1400);

    return () => window.clearInterval(interval);
  }, [running, speed]);

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setScenarioId(preset.id);
    setRunning(false);
    setSpeed(preset.speed);
    setUnits(preset.units);
    setEvents(buildInitialEvent(preset.seedEvent));
    eventCounter.current = 2;
  };

  const counters = useMemo(
    () =>
      stageOrder.map((stage) => ({
        stage,
        count: units.filter((unit) => unit.stage === stage).length,
      })),
    [units],
  );

  const activePreset = presets.find((preset) => preset.id === scenarioId) ?? presets[0];

  if (!user || user.role !== "superadmin") return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_18%),radial-gradient(circle_at_90%_12%,rgba(245,158,11,0.12),transparent_16%),linear-gradient(180deg,#07111f_0%,#0b1424_48%,#08111c_100%)] text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">Laboratorio</p>
            <h1 className="text-3xl font-extrabold" data-display="true">Simulación en tiempo real</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/superadmin")} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10">
              Volver al panel
            </button>
            <button onClick={() => setRunning((value) => !value)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${running ? "bg-rose-500 text-white hover:bg-rose-400" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"}`}>
              {running ? "Detener simulación" : "Iniciar simulación"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_70px_rgba(2,6,23,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Espacio aislado</p>
            <h2 className="mt-3 text-3xl font-extrabold">Pruebas operativas sin tocar la operación real</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Este laboratorio vive separado del producto principal. Sirve para probar flujos, tiempos y cuellos de botella sin ensuciar 81cc con lenguaje de demo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[1, 2, 4].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpeed(option as 1 | 2 | 4)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${speed === option ? "border-amber-400/35 bg-amber-400/10 text-amber-100" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"}`}
                >
                  Velocidad x{option}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyPreset(scenarioId)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
              >
                Reiniciar escenario
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {counters.map(({ stage, count }) => (
              <div key={stage} className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.10),rgba(255,255,255,0.02))] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{stageLabel[stage]}</p>
                <p className="mt-3 text-3xl font-extrabold">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_70px_rgba(2,6,23,0.28)]">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Escenarios</h2>
              <p className="text-sm text-slate-400">{activePreset.description}</p>
            </div>
            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100">
              {activePreset.name}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`rounded-[1.5rem] border p-4 text-left transition ${scenarioId === preset.id ? "border-amber-400/35 bg-amber-400/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}
              >
                <p className="font-bold">{preset.name}</p>
                <p className="mt-2 text-sm text-slate-400">{preset.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_70px_rgba(2,6,23,0.28)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Unidades en simulación</h2>
                <p className="text-sm text-slate-400">Los vehículos avanzan por etapas mientras la simulación está activa.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${running ? "bg-emerald-400/12 text-emerald-200" : "bg-slate-700/60 text-slate-300"}`}>
                {running ? "Corriendo" : "Pausada"}
              </span>
            </div>
            <div className="grid gap-4">
              {units.map((unit) => (
                <div key={unit.id} className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{unit.vehicle}</p>
                      <p className="text-sm text-slate-400">{unit.client} · {unit.plate}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${unit.priority === "urgente" ? "bg-amber-400/12 text-amber-200" : "bg-sky-400/12 text-sky-200"}`}>
                      {unit.priority}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{stageLabel[unit.stage]}</span>
                    <span className="text-slate-400">ETA {unit.eta}</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#f59e0b)] transition-all duration-1000" style={{ width: `${unit.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_70px_rgba(2,6,23,0.28)]">
            <h2 className="text-xl font-bold">Bitácora en vivo</h2>
            <p className="mt-1 text-sm text-slate-400">Eventos generados por la simulación mientras corre.</p>
            <div className="mt-5 space-y-3">
              {events.map((event) => (
                <div key={event.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{event.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${event.tone === "emerald" ? "bg-emerald-400/12 text-emerald-200" : event.tone === "amber" ? "bg-amber-400/12 text-amber-200" : event.tone === "rose" ? "bg-rose-400/12 text-rose-200" : "bg-sky-400/12 text-sky-200"}`}>
                      {event.time}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{event.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
