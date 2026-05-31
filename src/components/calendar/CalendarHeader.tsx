"use client";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatMonth } from "@/src/lib/calendar-utils";
import type { CalendarView } from "@/src/components/calendar/types";

interface CalendarHeaderProps {
  currentMonth: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onAddEvent: () => void;
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
  onAddEvent,
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

      <div className="w-full lg:hidden flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center justify-between gap-1 bg-orion-surface dark:bg-slate-900 p-0.5 rounded-xl border border-orion-border dark:border-orion-dark-border shadow-sm">
            <button
              type="button"
              aria-label="Periodo anterior"
              onClick={onPrevMonth}
              className="min-h-8 min-w-8 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="min-h-8 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orion-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              Hoy
            </button>
            <button
              type="button"
              aria-label="Periodo siguiente"
              onClick={onNextMonth}
              className="min-h-8 min-w-8 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          <div className="inline-flex items-center justify-end gap-1">
            <button
              type="button"
              className="btn-primary inline-flex h-8 w-8 items-center justify-center p-0"
              onClick={onAddEvent}
              aria-label="Anadir evento"
              title="Anadir evento"
            >
              <Plus size={15} />
            </button>

            <button
              type="button"
              className="btn-secondary inline-flex h-8 w-8 items-center justify-center p-0"
              onClick={onToggleCalendars}
              aria-expanded={isCalendarsOpen}
              aria-label="Mis calendarios"
              title="Mis calendarios"
            >
              <CalendarDays size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-1 bg-orion-surface dark:bg-slate-900 p-1 rounded-xl border border-orion-border dark:border-orion-dark-border shadow-sm min-w-0">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`px-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all whitespace-nowrap ${
                view === item.id
                  ? "bg-orion-primary text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-wrap items-stretch lg:items-center gap-1.5 w-auto">
        <div className="flex items-center justify-between gap-1.5 bg-orion-surface dark:bg-slate-900 p-1 rounded-2xl border border-orion-border dark:border-orion-dark-border shadow-sm">
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

        <div className="grid grid-cols-4 items-center gap-1 bg-orion-surface dark:bg-slate-900 p-1 rounded-2xl border border-orion-border dark:border-orion-dark-border shadow-sm min-w-0">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                view === item.id
                  ? "bg-orion-primary text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            className="btn-primary inline-flex h-9 w-9 items-center justify-center p-0"
            onClick={onAddEvent}
            aria-label="Anadir evento"
            title="Anadir evento"
          >
            <Plus size={16} />
          </button>

          <button
            type="button"
            className="btn-secondary inline-flex h-9 w-9 items-center justify-center p-0"
            onClick={onToggleCalendars}
            aria-expanded={isCalendarsOpen}
            aria-label="Mis calendarios"
            title="Mis calendarios"
          >
            <CalendarDays size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
