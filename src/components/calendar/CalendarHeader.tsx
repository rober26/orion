"use client";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { formatMonth } from "@/src/lib/calendar-utils";

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export default function CalendarHeader({ currentMonth, onPrevMonth, onNextMonth, onToday }: CalendarHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
          {formatMonth(currentMonth)}
        </h1>
        <p className="text-slate-500 font-medium">Cronograma de tu cerebro digital.</p>
      </div>

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
    </header>
  );
}
