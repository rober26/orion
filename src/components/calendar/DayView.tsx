"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarEventItem } from "@/src/components/calendar/types";
import { eventIntersectsDay, formatHourLabel } from "@/src/lib/calendar-utils";

interface DayViewProps {
  day: Date;
  events: CalendarEventItem[];
  onEventClick: (event: CalendarEventItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);

export default function DayView({ day, events, onEventClick }: DayViewProps) {
  const dayEvents = events.filter((event) => eventIntersectsDay(new Date(event.start), new Date(event.end), day));

  return (
    <div className="flex-1 surface-panel rounded-2xl sm:rounded-[2rem] overflow-hidden min-h-0">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-orion-border dark:border-orion-dark-border bg-slate-50/60 dark:bg-slate-900/40">
        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">{format(day, "EEEE d 'de' MMMM", { locale: es })}</p>
      </div>

      <div className="overflow-y-auto h-[calc(100%-56px)]">
        {HOURS.map((hour) => {
          const eventsForHour = dayEvents.filter((event) => {
            if (event.allDay) {
              return hour === 0;
            }

            return new Date(event.start).getHours() === hour;
          });

          return (
            <div key={hour} className="grid grid-cols-[72px_1fr] sm:grid-cols-[90px_1fr] min-h-14 sm:min-h-16 border-b border-orion-border/60 dark:border-orion-dark-border/60">
              <div className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-400">{formatHourLabel(new Date(2024, 0, 1, hour, 0))}</div>
              <DayDropCell day={day} hour={hour}>
                {eventsForHour.map((event) => (
                  <DraggableDayEvent
                    key={`${event.sourceType}:${event.id}`}
                    item={event}
                    onClick={onEventClick}
                  />
                ))}
              </DayDropCell>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayDropCell({ day, hour, children }: { day: Date; hour: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `hour:${format(day, "yyyy-MM-dd")}:${hour}`,
    data: { day, hour },
  });

  return (
    <div ref={setNodeRef} className={`px-2 py-1 space-y-1 ${isOver ? "bg-cyan-100/70 dark:bg-cyan-950/35" : ""}`}>
      {children}
    </div>
  );
}

function DraggableDayEvent({
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
      className={`w-full text-left rounded-md border border-orion-border dark:border-orion-dark-border px-2 py-1 text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${
        item.canReschedule ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      {...attributes}
      {...listeners}
    >
      {item.title}
    </button>
  );
}
