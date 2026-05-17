"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format, isSameMonth, isToday, isWeekend } from "date-fns";
import CalendarEvent from "@/src/components/calendar/CalendarEvent";
import { eventIntersectsDay } from "@/src/lib/calendar-utils";
import type { CalendarEventItem } from "@/src/components/calendar/types";

interface MonthViewProps {
  days: Date[];
  currentMonth: Date;
  events: CalendarEventItem[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEventItem) => void;
  onEventContextMenu: (event: CalendarEventItem, x: number, y: number) => void;
}

export default function MonthView({ days, currentMonth, events, onDayClick, onEventClick, onEventContextMenu }: MonthViewProps) {
  const weeks = days.length > 35 ? 6 : 5;
  const getEventsForDay = (day: Date): CalendarEventItem[] => {
    return events.filter((event) => eventIntersectsDay(new Date(event.start), new Date(event.end), day));
  };

  return (
    <div className="h-full min-h-0 max-h-full flex flex-col surface-panel dark:bg-slate-900/50 rounded-2xl sm:rounded-[1.75rem] overflow-hidden shadow-xl">
      <div className="grid grid-cols-7 bg-slate-50/60 dark:bg-slate-900/40 border-b border-orion-border dark:border-orion-dark-border shrink-0">
        {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map((d) => (
          <div key={d} className="py-1.5 sm:py-2 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
            {d}
          </div>
        ))}
      </div>

      <div
        className="flex-1 h-full min-h-0 grid grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const visibleEvents = dayEvents.slice(0, 3);
          const remaining = dayEvents.length - visibleEvents.length;
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <MonthDayCell key={i} day={day} isCurrentMonth={isCurrentMonth} onDayClick={onDayClick}>
              <div className="flex justify-between items-start mb-1.5">
                <span
                  className={`
                    text-[11px] sm:text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-all
                    ${
                      isToday(day)
                        ? "bg-orion-primary text-white"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-orion-primary"
                    }
                  `}
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="flex-1 min-h-0 space-y-1 overflow-y-auto custom-scrollbar">
                {visibleEvents.map((event) => (
                  <DraggableMonthEvent
                    key={`${event.sourceType}:${event.id}:${day.toISOString()}`}
                    item={event}
                    day={day}
                    onClick={onEventClick}
                    onContextMenu={onEventContextMenu}
                  />
                ))}

                {remaining > 0 ? (
                  <button
                    type="button"
                     className="w-full text-left px-1.5 py-1 rounded-md text-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-orion-primary"
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
        min-h-0 h-full p-1 sm:p-1.5 border-r border-b border-orion-border/80 dark:border-orion-dark-border group transition-all cursor-pointer
        ${!isCurrentMonth ? "bg-slate-50/20 dark:bg-slate-950/10 opacity-40" : isWeekend(day) ? "bg-slate-50/35 dark:bg-slate-900/35" : "bg-white dark:bg-slate-900"}
        ${isCurrentMonth ? "hover:bg-slate-50 dark:hover:bg-slate-800/60" : ""}
        ${isOver ? "ring-2 ring-orion-primary/40 bg-blue-50/40 dark:bg-blue-950/20" : ""}
      `}
    >
      <div className="h-full min-h-0 flex flex-col">{children}</div>
    </div>
  );
}

function DraggableMonthEvent({
  item,
  day,
  onClick,
  onContextMenu,
}: {
  item: CalendarEventItem;
  day: Date;
  onClick: (item: CalendarEventItem) => void;
  onContextMenu: (event: CalendarEventItem, x: number, y: number) => void;
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
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(item, event.clientX, event.clientY);
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
