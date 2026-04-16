"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import StatsGrid from "@/src/components/dashboard/overview/StatsGrid";
import UpcomingList from "@/src/components/dashboard/overview/UpcomingList";
import RecentProjects from "@/src/components/dashboard/overview/RecentProjects";
import QuickActions from "@/src/components/dashboard/overview/QuickActions";
import DashboardSkeleton from "@/src/components/dashboard/overview/DashboardSkeleton";
import type {
  DashboardEventItem,
  DashboardProject,
  DashboardRange,
  DashboardStats,
  MeResponse,
} from "@/src/components/dashboard/overview/types";

type NotebookItem = { id: string };

type DashboardState = {
  userName: string;
  stats: DashboardStats;
  upcoming: DashboardEventItem[];
  recentProjects: DashboardProject[];
};

const DEFAULT_STATE: DashboardState = {
  userName: "Usuario",
  stats: {
    activeProjects: 0,
    archivedProjects: 0,
    notebooks: 0,
    rangeItems: 0,
  },
  upcoming: [],
  recentProjects: [],
};

function getIsoWindow(range: DashboardRange): { from: string; to: string } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);

  if (range === "today") {
    to.setDate(to.getDate());
  } else if (range === "30d") {
    to.setDate(to.getDate() + 30);
  } else {
    to.setDate(to.getDate() + 7);
  }

  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("7d");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { from, to } = getIsoWindow(range);
      const [meRes, projectsRes, notebooksRes, calendarRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/projects?status=all", { cache: "no-store" }),
        fetch("/api/notebooks", { cache: "no-store" }),
        fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          cache: "no-store",
        }),
      ]);

      if (!meRes.ok || !projectsRes.ok || !notebooksRes.ok || !calendarRes.ok) {
        throw new Error("No se pudo cargar el resumen");
      }

      const [meRaw, projectsRaw, notebooksRaw, calendarRaw] = await Promise.all([
        meRes.json(),
        projectsRes.json(),
        notebooksRes.json(),
        calendarRes.json(),
      ]);

      const me = meRaw as MeResponse;
      const projects = asArray<DashboardProject>(projectsRaw);
      const notebooks = asArray<NotebookItem>(notebooksRaw);
      const weekItems = asArray<DashboardEventItem>(calendarRaw)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      const activeProjects = projects.filter((project) => !project.isArchived);
      const archivedProjects = projects.filter((project) => Boolean(project.isArchived));
      const recentProjects = [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      setData({
        userName: me.name || me.username || "Usuario",
        stats: {
          activeProjects: activeProjects.length,
          archivedProjects: archivedProjects.length,
          notebooks: notebooks.length,
          rangeItems: weekItems.length,
        },
        upcoming: weekItems.slice(0, 8),
        recentProjects,
      });
    } catch {
      setError("No se pudo cargar tu resumen. Intenta de nuevo.");
      setData(DEFAULT_STATE);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:p-5">
        <section className="surface-panel overflow-hidden rounded-[2rem] border-none bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100">Resumen diario</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Hola, {data.userName}</h1>
              <p className="mt-2 text-sm text-blue-100 sm:text-base">{todayLabel}. Aqui tienes lo mas importante para hoy.</p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm sm:self-auto">
              <Sparkles size={16} />
              Centro de control Orion
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <StatsGrid stats={data.stats} />

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr] 2xl:grid-cols-[1.45fr_1fr_1fr]">
          <UpcomingList items={data.upcoming} className="xl:row-span-2" />

          <RecentProjects projects={data.recentProjects} />

          <div className="surface-panel flex h-full min-h-0 flex-col rounded-[1.8rem] p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Rango</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { key: "today", label: "Hoy" },
                { key: "7d", label: "7 dias" },
                { key: "30d", label: "30 dias" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRange(item.key as DashboardRange)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                    range === item.key
                      ? "border-transparent bg-orion-primary text-white"
                      : "border-orion-border bg-white text-slate-600 hover:bg-slate-50 dark:border-orion-dark-border dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="surface-soft mt-4 rounded-[1.3rem] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Agenda</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-2 text-orion-primary dark:bg-blue-900/30">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{data.stats.rangeItems}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">eventos y tareas en el rango</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex-1">
              <QuickActions />
            </div>
          </div>

          <RecentProjects projects={data.recentProjects} className="hidden 2xl:flex" />
        </section>
      </div>
    </div>
  );
}
