"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "@/src/lib/calendar-utils";
import type { CalendarView } from "@/src/components/calendar/types";

interface CalendarHeaderProps {
  currentMonth: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onCreateEvent: () => void;
}

const VIEWS: Array<{ id: CalendarView; label: string }> = [
  { id: "month", label: "Mes" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Dia" },
  { id: "agenda", label: "Agenda" },
];

export default function CalendarHeader({
  currentMonth,
  view,
  onViewChange,
  onPrevMonth,
  onNextMonth,
  onToday,
  onCreateEvent,
}: CalendarHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
          {formatMonth(currentMonth)}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-orion-surface dark:bg-slate-900 p-1.5 rounded-2xl border border-orion-border dark:border-orion-dark-border shadow-sm">
          <button onClick={onPrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={onToday}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-orion-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
          >
            Hoy
          </button>
          <button onClick={onNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-orion-surface dark:bg-slate-900 p-1.5 rounded-2xl border border-orion-border dark:border-orion-dark-border shadow-sm">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                view === item.id
                  ? "bg-orion-primary text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button type="button" className="btn-primary" onClick={onCreateEvent}>
          Nuevo evento
        </button>
      </div>
    </header>
  );
}
