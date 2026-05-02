"use client";

import Link from "next/link";
import { ArrowUpRight, FolderKanban, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardProject } from "./types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function RecentProjects({ className = "" }: { className?: string }) {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setError(null);

        const response = await fetch("/api/projects?status=active", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("RECENT_PROJECTS_FETCH_ERROR");
        }

        const payload = asArray<DashboardProject>(await response.json())
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 8);

        if (!cancelled) {
          setProjects(payload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar la actividad de proyectos.");
          setProjects([]);
          setLoading(false);
        }
      }
    };

    void loadProjects();
    const intervalId = window.setInterval(() => {
      void loadProjects();
    }, 25000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className={`surface-panel flex h-full min-h-0 flex-col rounded-[1.8rem] p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Actividad reciente</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">Proyectos</h2>
        </div>
        <Link href="/projects" className="text-xs font-bold uppercase tracking-wide text-orion-primary hover:underline">
          Ver todo
        </Link>
      </div>

      {error && <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}

      {loading ? (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : projects.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-orion-border px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:border-orion-dark-border dark:text-slate-400">
          Aun no hay proyectos recientes.
        </p>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:border-blue-900/40 dark:hover:bg-blue-950/20"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: project.color || "#2563eb" }}
              >
                <FolderKanban size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{project.name}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{formatDate(project.updatedAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {(project._count?.users || 0) + 1}
                  </span>
                </p>
              </div>

              <ArrowUpRight size={14} className="text-slate-400 transition-colors group-hover:text-orion-primary" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
