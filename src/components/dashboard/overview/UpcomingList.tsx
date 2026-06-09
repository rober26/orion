"use client";

import { Calendar, CheckSquare, FolderPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [layoutMode, setLayoutMode] = useState<"mobile" | "tablet" | "desktop">("mobile");

  useEffect(() => {
    const updateLayout = () => {
      if (window.innerWidth >= 1024) {
        setLayoutMode("desktop");
        return;
      }

      if (window.innerWidth >= 768) {
        setLayoutMode("tablet");
        return;
      }

      setLayoutMode("mobile");
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  const visibleItems = useMemo(() => {
    if (layoutMode === "desktop") {
      return items.slice(0, 10);
    }

    if (layoutMode === "tablet") {
      return items.slice(0, 3);
    }

    return items.slice(0, 2);
  }, [items, layoutMode]);

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
    <section className={`surface-panel flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.8rem] p-3 sm:p-4 lg:p-5 ${className}`}>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Proximos 7 dias</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">Agenda clave</h2>
        </div>
      </div>

      {error && <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}

      {loading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-16" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-16" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-16" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-orion-border px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:border-orion-dark-border dark:text-slate-400">
          Sin eventos o tareas programadas para esta semana.
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {visibleItems.map((item) => (
            <article
              key={`${item.sourceType}-${item.id}`}
              className="flex flex-col gap-1.5 rounded-2xl border border-slate-100 bg-slate-50/70 px-2.5 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/60 lg:flex-row lg:items-center lg:gap-3 lg:px-3 lg:py-3 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-blue-900/40 dark:hover:bg-blue-950/20"
            >
              <div className="flex min-w-0 items-center gap-3 lg:flex-1">
                <span
                  className="h-10 w-1.5 rounded-full"
                  style={{ backgroundColor: item.color || "#3b82f6" }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.projectName}</p>
                </div>
              </div>

              <div className="text-left lg:text-right">
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
