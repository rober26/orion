"use client";

import { useEffect, useMemo, useState } from "react";
import StatsGrid from "@/src/components/dashboard/overview/StatsGrid";
import UpcomingList from "@/src/components/dashboard/overview/UpcomingList";
import RecentProjects from "@/src/components/dashboard/overview/RecentProjects";
import type { MeResponse } from "@/src/components/dashboard/overview/types";

export default function DashboardPage() {
  const [userName, setUserName] = useState("Usuario");
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("ME_FETCH_ERROR");
        }

        const payload = (await response.json()) as MeResponse;
        if (!cancelled) {
          setUserName(payload.name || payload.username || "Usuario");
        }
      } catch {
        if (!cancelled) {
          setUserName("Usuario");
        }
      } finally {
        if (!cancelled) {
          setIsUserLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:p-5">
        <section className="surface-panel overflow-hidden rounded-[2rem] border-none bg-gradient-to-r from-blue-600 via-sky-700 to-cyan-600 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100">Resumen diario</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Hola, {isUserLoading ? "..." : userName}
            </h1>
            <p className="text-sm text-blue-100 sm:text-base">{todayLabel}</p>
          </div>
        </section>

        <StatsGrid />

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
          <UpcomingList />
          <RecentProjects />
        </section>
      </div>
    </div>
  );
}
