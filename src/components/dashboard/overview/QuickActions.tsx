import Link from "next/link";
import { CalendarPlus, FolderPlus, NotebookPen } from "lucide-react";

const actions = [
  {
    href: "/projects",
    label: "Nuevo proyecto",
    icon: FolderPlus,
    style: "bg-blue-600 text-white border-transparent hover:bg-blue-700",
  },
  {
    href: "/calendar",
    label: "Abrir calendario",
    icon: CalendarPlus,
    style:
      "bg-orion-surface text-slate-700 border-orion-border hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-orion-dark-border dark:hover:bg-slate-800",
  },
  {
    href: "/notebooks",
    label: "Nueva nota",
    icon: NotebookPen,
    style:
      "bg-orion-surface text-slate-700 border-orion-border hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-orion-dark-border dark:hover:bg-slate-800",
  },
];

export default function QuickActions() {
  return (
    <section className="surface-panel h-full rounded-[1.8rem] p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Accesos rapidos</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${action.style}`}
          >
            <action.icon size={16} />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
