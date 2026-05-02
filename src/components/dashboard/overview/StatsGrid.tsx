"use client";

import { BookOpenText, CalendarClock, FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardEventItem, DashboardProject, DashboardStats } from "./types";

type NotebookItem = { id: string };

type StatsState = {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
};

const DEFAULT_STATS: DashboardStats = {
  activeProjects: 0,
  notebooks: 0,
  upcomingItems: 0,
};

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

type StatCardProps = {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, accent, icon }: StatCardProps) {
  return (
    <article className="surface-panel group rounded-[1.6rem] p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <div className={`rounded-xl p-2 ${accent}`}>{icon}</div>
      </div>

      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </article>
  );
}

export default function StatsGrid() {
  const [state, setState] = useState<StatsState>({
    stats: DEFAULT_STATS,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const { from, to } = getWeekWindow();
        const [projectsRes, notebooksRes, calendarRes] = await Promise.all([
          fetch("/api/projects?status=active", { cache: "no-store" }),
          fetch("/api/notebooks", { cache: "no-store" }),
          fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
            cache: "no-store",
          }),
        ]);

        if (!projectsRes.ok || !notebooksRes.ok || !calendarRes.ok) {
          throw new Error("STATS_FETCH_ERROR");
        }

        const [projectsRaw, notebooksRaw, calendarRaw] = await Promise.all([
          projectsRes.json(),
          notebooksRes.json(),
          calendarRes.json(),
        ]);

        const projects = asArray<DashboardProject>(projectsRaw);
        const notebooks = asArray<NotebookItem>(notebooksRaw);
        const upcoming = asArray<DashboardEventItem>(calendarRaw);

        if (!cancelled) {
          setState({
            stats: {
              activeProjects: projects.length,
              notebooks: notebooks.length,
              upcomingItems: upcoming.length,
            },
            loading: false,
            error: null,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            stats: DEFAULT_STATS,
            loading: false,
            error: "No se pudieron cargar los indicadores.",
          });
        }
      }
    };

    void loadStats();
    const intervalId = window.setInterval(() => {
      void loadStats();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="space-y-3">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Proyectos activos"
          value={state.loading ? 0 : state.stats.activeProjects}
          accent="bg-blue-100 text-orion-primary dark:bg-blue-900/30"
          icon={<FolderKanban size={18} />}
        />
        <StatCard
          label="Notebooks"
          value={state.loading ? 0 : state.stats.notebooks}
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
          icon={<BookOpenText size={18} />}
        />
        <StatCard
          label="Agenda 7 dias"
          value={state.loading ? 0 : state.stats.upcomingItems}
          accent="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300"
          icon={<CalendarClock size={18} />}
        />
      </div>
    </section>
  );
}
