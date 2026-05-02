"use client";

import { Calendar, CheckSquare, FolderPlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardEventItem } from "./types";

function sourceLabel(type: DashboardEventItem["sourceType"]) {
  if (type === "task") {
    return "Tarea";
  }

  if (type === "project") {
    return "Proyecto";
  }

  return "Evento";
}

function sourceIcon(type: DashboardEventItem["sourceType"]) {
  if (type === "task") {
    return <CheckSquare size={14} />;
  }

  if (type === "project") {
    return <FolderPlus size={14} />;
  }

  return <Calendar size={14} />;
}

function formatWhen(item: DashboardEventItem): string {
  const date = new Date(item.start);

  if (item.allDay) {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getWeekWindow(): { from: string; to: string } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function UpcomingList({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<DashboardEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUpcoming = async () => {
      try {
        setError(null);

        const { from, to } = getWeekWindow();
        const response = await fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("UPCOMING_FETCH_ERROR");
        }

        const payload = asArray<DashboardEventItem>(await response.json())
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .slice(0, 10);

        if (!cancelled) {
          setItems(payload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar la agenda.");
          setItems([]);
          setLoading(false);
        }
      }
    };

    void loadUpcoming();
    const intervalId = window.setInterval(() => {
      void loadUpcoming();
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className={`surface-panel flex h-full min-h-0 flex-col rounded-[1.8rem] p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Proximos 7 dias</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">Agenda clave</h2>
        </div>
      </div>

      {error && <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}

      {loading ? (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-orion-border px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:border-orion-dark-border dark:text-slate-400">
          Sin eventos o tareas programadas para esta semana.
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <article
              key={`${item.sourceType}-${item.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 transition-all hover:border-blue-100 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-blue-900/40 dark:hover:bg-blue-950/20"
            >
              <span
                className="h-10 w-1.5 rounded-full"
                style={{ backgroundColor: item.color || "#3b82f6" }}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.projectName}</p>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatWhen(item)}</p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {sourceIcon(item.sourceType)}
                  {sourceLabel(item.sourceType)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
