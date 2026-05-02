"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { addDays, format, startOfWeek } from "date-fns";
import type { CalendarEventItem } from "@/src/components/calendar/types";
import { eventIntersectsDay, formatHourLabel } from "@/src/lib/calendar-utils";

interface WeekViewProps {
  anchorDate: Date;
  events: CalendarEventItem[];
  onEventClick: (event: CalendarEventItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);

export default function WeekView({ anchorDate, events, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const getDayEvents = (day: Date) =>
    events.filter((event) => eventIntersectsDay(new Date(event.start), new Date(event.end), day));

  return (
    <div className="flex-1 surface-panel rounded-2xl sm:rounded-[2rem] overflow-hidden min-h-0">
      <div className="grid grid-cols-8 border-b border-orion-border dark:border-orion-dark-border bg-slate-50/60 dark:bg-slate-900/40">
        <div className="p-1.5 sm:p-2 text-[10px] sm:text-xs text-slate-400">Hora</div>
        {days.map((day) => (
          <div key={day.toISOString()} className="p-1.5 sm:p-2 text-center border-l border-orion-border dark:border-orion-dark-border">
            <p className="text-[10px] sm:text-xs text-slate-400 uppercase">{format(day, "EEE")}</p>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">{format(day, "d")}</p>
          </div>
        ))}
      </div>

      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 min-h-16 border-b border-orion-border/60 dark:border-orion-dark-border/60">
            <div className="px-2 py-1 text-[10px] text-slate-400">{formatHourLabel(new Date(2024, 0, 1, hour, 0))}</div>

            {days.map((day) => {
              const eventsForDay = getDayEvents(day).filter((event) => {
                const start = new Date(event.start);
                return event.allDay ? hour === 0 : start.getHours() === hour;
              });

              return (
                <WeekDropCell key={`${day.toISOString()}:${hour}`} day={day} hour={hour}>
                  <div className="space-y-1">
                    {eventsForDay.map((event) => (
                      <DraggableWeekEvent
                        key={`${event.sourceType}:${event.id}`}
                        item={event}
                        onClick={onEventClick}
                      />
                    ))}
                  </div>
                </WeekDropCell>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekDropCell({ day, hour, children }: { day: Date; hour: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `hour:${format(day, "yyyy-MM-dd")}:${hour}`,
    data: { day, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`px-1 py-1 border-l border-orion-border/60 dark:border-orion-dark-border/60 ${
        isOver ? "bg-orion-primary/10" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DraggableWeekEvent({
  item,
  onClick,
}: {
  item: CalendarEventItem;
  onClick: (item: CalendarEventItem) => void;
}) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: `item:${item.sourceType}:${item.id}`,
    disabled: !item.canReschedule,
    data: { item },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onClick(item)}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`w-full text-left rounded-md border border-orion-border dark:border-orion-dark-border px-2 py-1 text-[10px] font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${
        item.canReschedule ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      {...attributes}
      {...listeners}
    >
      {item.title}
    </button>
  );
}
