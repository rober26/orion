"use client";
import { isSameMonth, isToday, format } from "date-fns";
import CalendarEvent from "./CalendarEvent";

interface CalendarGridProps {
  days: Date[];
  currentMonth: Date;
  events: any[];
  onDayClick: (day: Date) => void;
}

export default function CalendarGrid({ days, currentMonth, events, onDayClick }: CalendarGridProps) {
  
  // Función para filtrar eventos por cada día específico
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-orion-border dark:border-slate-800 overflow-hidden shadow-2xl">
      
      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 bg-slate-50/50 dark:bg-slate-800/30 border-b border-orion-border dark:border-slate-800">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {d}
          </div>
        ))}
      </div>

      {/* Cuerpo del calendario */}
      <div className="flex-1 grid grid-cols-7 overflow-y-auto overflow-x-hidden">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div 
              key={i} 
              onClick={() => onDayClick(day)}
              className={`
                min-h-[120px] p-2 border-r border-b border-orion-border dark:border-slate-800 group transition-all cursor-pointer
                ${!isCurrentMonth ? "bg-slate-50/30 dark:bg-slate-950/10 opacity-30" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}
              `}
            >
              {/* Número del día */}
              <div className="flex justify-between items-start mb-2">
                <span className={`
                  text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all
                  ${isToday(day) 
                    ? "bg-orion-primary text-white shadow-lg shadow-blue-500/40 scale-110" 
                    : "text-slate-500 dark:text-slate-400 group-hover:text-orion-primary"
                  }
                `}>
                  {format(day, "d")}
                </span>
              </div>

              {/* Contenedor de Eventos */}
              <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                {dayEvents.map((event) => (
                  <CalendarEvent 
                    key={event.id}
                    title={event.title}
                    type={event.type}
                    color={event.color}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}