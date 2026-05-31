"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckSquare, FolderKanban } from "lucide-react";
import type { CalendarEventItem } from "@/src/components/calendar/types";
import { eventIntersectsDay, formatHourLabel } from "@/src/lib/calendar-utils";

interface WeekViewProps {
  anchorDate: Date;
  events: CalendarEventItem[];
  onEventClick: (event: CalendarEventItem) => void;
  onSlotClick: (day: Date, hour: number) => void;
  onSlotContextMenu: (day: Date, hour: number, x: number, y: number) => void;
  onEventContextMenu: (event: CalendarEventItem, x: number, y: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);

export default function WeekView({
  anchorDate,
  events,
  onEventClick,
  onSlotClick,
  onSlotContextMenu,
  onEventContextMenu,
}: WeekViewProps) {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const getDayEvents = (day: Date) =>
    events.filter((event) => eventIntersectsDay(new Date(event.start), new Date(event.end), day));

  return (
    <div className="h-full min-h-0 surface-panel rounded-2xl sm:rounded-[1.5rem] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-8 border-b border-orion-border dark:border-orion-dark-border bg-slate-50/60 dark:bg-slate-900/40 shrink-0">
            <div className="p-1.5 text-[10px] text-slate-400">Hora</div>
            {days.map((day) => (
              <div key={day.toISOString()} className="p-1.5 text-center border-l border-orion-border dark:border-orion-dark-border">
                <p className="text-[10px] text-slate-400 uppercase">{format(day, "EEE", { locale: es })}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{format(day, "d")}</p>
              </div>
            ))}
          </div>

          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 min-h-11 border-b border-orion-border/60 dark:border-orion-dark-border/60">
              <div className="px-2 py-1.5 text-[10px] text-slate-400">{formatHourLabel(new Date(2024, 0, 1, hour, 0))}</div>

              {days.map((day) => {
                const eventsForDay = getDayEvents(day).filter((event) => {
                  const start = new Date(event.start);
                  return event.allDay ? hour === 0 : start.getHours() === hour;
                });

                return (
                  <WeekDropCell
                    key={`${day.toISOString()}:${hour}`}
                    day={day}
                    hour={hour}
                    onClick={onSlotClick}
                    onContextMenu={onSlotContextMenu}
                  >
                    <div className="space-y-1">
                      {eventsForDay.map((event) => (
                        <DraggableWeekEvent
                          key={`${event.sourceType}:${event.id}`}
                          item={event}
                          onClick={onEventClick}
                          onContextMenu={onEventContextMenu}
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
    </div>
  );
}

function WeekDropCell({
  day,
  hour,
  children,
  onClick,
  onContextMenu,
}: {
  day: Date;
  hour: number;
  children: React.ReactNode;
  onClick: (day: Date, hour: number) => void;
  onContextMenu: (day: Date, hour: number, x: number, y: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `hour:${format(day, "yyyy-MM-dd")}:${hour}`,
    data: { day, hour },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClick(day, hour)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(day, hour, event.clientX, event.clientY);
      }}
      className={`px-1 py-1 border-l border-orion-border/60 dark:border-orion-dark-border/60 ${
        isOver ? "bg-blue-100/70 dark:bg-blue-950/35" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DraggableWeekEvent({
  item,
  onClick,
  onContextMenu,
}: {
  item: CalendarEventItem;
  onClick: (item: CalendarEventItem) => void;
  onContextMenu: (event: CalendarEventItem, x: number, y: number) => void;
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
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(item, event.clientX, event.clientY);
      }}
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
      <span className="inline-flex items-center gap-1">
        {item.sourceType === "project" ? (
          <FolderKanban size={11} />
        ) : item.sourceType === "task" ? (
          <CheckSquare size={11} />
        ) : (
          <Calendar size={11} />
        )}
        <span className="truncate">{item.title}</span>
      </span>
    </button>
  );
}
