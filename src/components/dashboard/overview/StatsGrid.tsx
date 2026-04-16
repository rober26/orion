import { Archive, BookOpenText, CalendarClock, FolderKanban } from "lucide-react";
import type { DashboardStats } from "./types";

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

export default function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Proyectos activos"
        value={stats.activeProjects}
        accent="bg-blue-100 text-orion-primary dark:bg-blue-900/30"
        icon={<FolderKanban size={18} />}
      />
      <StatCard
        label="Proyectos archivados"
        value={stats.archivedProjects}
        accent="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
        icon={<Archive size={18} />}
      />
      <StatCard
        label="Notebooks"
        value={stats.notebooks}
        accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        icon={<BookOpenText size={18} />}
      />
      <StatCard
        label="Agenda"
        value={stats.rangeItems}
        accent="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300"
        icon={<CalendarClock size={18} />}
      />
    </section>
  );
}
