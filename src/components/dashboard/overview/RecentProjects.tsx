"use client";

import Link from "next/link";
import { ArrowUpRight, FolderKanban, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

  const visibleProjects = useMemo(() => {
    if (layoutMode === "desktop") {
      return projects.slice(0, 8);
    }

    if (layoutMode === "tablet") {
      return projects.slice(0, 3);
    }

    return projects.slice(0, 2);
  }, [layoutMode, projects]);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setError(null);

        const response = await fetch("/api/projects?status=active", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("RECENT_PROJECTS_FETCH_ERROR");
        }

        const payload = asArray<DashboardProject>(await response.json()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

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
    <section className={`surface-panel flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.8rem] p-3 sm:p-4 lg:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Actividad reciente</p>
          <h2 className="mt-1 text-base font-black tracking-tight text-slate-900 sm:text-lg dark:text-white">Proyectos</h2>
        </div>
        <Link href="/projects" className="shrink-0 text-xs font-bold uppercase tracking-wide text-orion-primary hover:underline">
          Ver todo
        </Link>
      </div>

      {error && <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}

      {loading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-14" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-14" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-14" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : visibleProjects.length === 0 ? (
        <p className="flex items-center justify-center rounded-2xl border border-dashed border-orion-border px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:border-orion-dark-border dark:text-slate-400">
          Aun no hay proyectos recientes.
        </p>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {visibleProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex flex-col gap-1.5 rounded-2xl border border-slate-100 px-2.5 py-2.5 transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/60 lg:flex-row lg:items-center lg:gap-3 lg:px-3 lg:py-3 dark:border-slate-800 dark:hover:border-blue-900/40 dark:hover:bg-blue-950/20"
            >
              <div className="flex w-full min-w-0 items-center gap-3 lg:w-auto lg:flex-none">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
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
              </div>

              <ArrowUpRight size={14} className="self-end text-slate-400 transition-colors group-hover:text-orion-primary lg:self-auto" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
