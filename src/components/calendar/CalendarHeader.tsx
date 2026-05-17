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
  onToggleCalendars: () => void;
  isCalendarsOpen: boolean;
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
  onToggleCalendars,
  isCalendarsOpen,
}: CalendarHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
      <div>
        <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
          {formatMonth(currentMonth)}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_auto] lg:flex lg:flex-wrap items-stretch lg:items-center gap-1.5 w-full lg:w-auto">
        <div className="flex items-center justify-between gap-1.5 bg-orion-surface dark:bg-slate-900 p-1 rounded-xl sm:rounded-2xl border border-orion-border dark:border-orion-dark-border shadow-sm">
          <button
            type="button"
            aria-label="Periodo anterior"
            onClick={onPrevMonth}
            className="min-h-9 min-w-9 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="min-h-9 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-orion-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Periodo siguiente"
            onClick={onNextMonth}
            className="min-h-9 min-w-9 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-4 items-center gap-1 bg-orion-surface dark:bg-slate-900 p-1 rounded-xl sm:rounded-2xl border border-orion-border dark:border-orion-dark-border shadow-sm">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${
                view === item.id
                  ? "bg-orion-primary text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-secondary w-full sm:w-auto !px-3 !py-1.5 !text-xs inline-flex items-center gap-2"
          onClick={onToggleCalendars}
          aria-expanded={isCalendarsOpen}
        >
          Mis calendarios
        </button>
      </div>
    </header>
  );
}
