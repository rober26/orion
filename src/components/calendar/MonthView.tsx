"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format, isSameMonth, isToday } from "date-fns";
import CalendarEvent from "@/src/components/calendar/CalendarEvent";
import { eventIntersectsDay } from "@/src/lib/calendar-utils";
import type { CalendarEventItem } from "@/src/components/calendar/types";

interface MonthViewProps {
  days: Date[];
  currentMonth: Date;
  events: CalendarEventItem[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEventItem) => void;
}

export default function MonthView({ days, currentMonth, events, onDayClick, onEventClick }: MonthViewProps) {
  const getEventsForDay = (day: Date): CalendarEventItem[] => {
    return events.filter((event) => eventIntersectsDay(new Date(event.start), new Date(event.end), day));
  };

  return (
    <div className="flex-1 flex flex-col surface-panel dark:bg-slate-900/50 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl min-h-0">
      <div className="grid grid-cols-7 bg-slate-50/50 dark:bg-slate-800/30 border-b border-orion-border dark:border-orion-dark-border">
        {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((d) => (
          <div key={d} className="py-2 sm:py-4 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 overflow-y-auto overflow-x-hidden">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const visibleEvents = dayEvents.slice(0, 3);
          const remaining = dayEvents.length - visibleEvents.length;
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <MonthDayCell key={i} day={day} isCurrentMonth={isCurrentMonth} onDayClick={onDayClick}>
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`
                    text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all
                    ${
                      isToday(day)
                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/40 scale-110"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300"
                    }
                  `}
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="space-y-1 max-h-[110px] overflow-y-auto custom-scrollbar">
                {visibleEvents.map((event) => (
                  <DraggableMonthEvent
                    key={`${event.sourceType}:${event.id}:${day.toISOString()}`}
                    item={event}
                    day={day}
                    onClick={onEventClick}
                  />
                ))}

                {remaining > 0 ? (
                  <button
                    type="button"
                     className="w-full text-left px-1.5 py-1 rounded-md text-[10px] font-semibold text-slate-500 hover:text-cyan-700 dark:hover:text-cyan-300"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDayClick(day);
                    }}
                  >
                    +{remaining} mas
                  </button>
                ) : null}
              </div>
            </MonthDayCell>
          );
        })}
      </div>
    </div>
  );
}

function MonthDayCell({
  day,
  isCurrentMonth,
  onDayClick,
  children,
}: {
  day: Date;
  isCurrentMonth: boolean;
  onDayClick: (day: Date) => void;
  children: React.ReactNode;
}) {
  const dropId = `day:${format(day, "yyyy-MM-dd")}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId, data: { day } });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(day)}
      className={`
        min-h-[96px] sm:min-h-[130px] p-1.5 sm:p-2 border-r border-b border-orion-border dark:border-orion-dark-border group transition-all cursor-pointer
        ${!isCurrentMonth ? "bg-slate-50/30 dark:bg-slate-950/10 opacity-35" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}
        ${isOver ? "ring-2 ring-cyan-500/40 bg-cyan-50/40 dark:bg-cyan-950/20" : ""}
      `}
    >
      {children}
    </div>
  );
}

function DraggableMonthEvent({
  item,
  day,
  onClick,
}: {
  item: CalendarEventItem;
  day: Date;
  onClick: (item: CalendarEventItem) => void;
}) {
  const draggableId = `item:${item.sourceType}:${item.id}:${format(day, "yyyy-MM-dd")}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled: !item.canReschedule,
    data: { item },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.6 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <CalendarEvent
        title={item.title}
        type={item.sourceType}
        color={item.color || undefined}
        draggable={item.canReschedule}
        onClick={() => onClick(item)}
      />
    </div>
  );
}
