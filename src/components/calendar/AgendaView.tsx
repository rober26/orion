"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { addDays, startOfDay } from "date-fns";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarEventItem } from "@/src/components/calendar/types";

interface AgendaViewProps {
  anchorDate: Date;
  events: CalendarEventItem[];
  onEventClick: (event: CalendarEventItem) => void;
  onDayClick: (day: Date) => void;
  onEventContextMenu: (event: CalendarEventItem, x: number, y: number) => void;
}

export default function AgendaView({ anchorDate, events, onEventClick, onDayClick, onEventContextMenu }: AgendaViewProps) {
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const dropDays = Array.from({ length: 30 }, (_, index) => addDays(startOfDay(anchorDate), index));
  const dayCountMap = sorted.reduce<Record<string, number>>((acc, item) => {
    const key = format(new Date(item.start), "yyyy-MM-dd");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  if (sorted.length === 0) {
    return (
      <div className="h-full min-h-0 surface-panel rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-5 text-sm text-slate-500 dark:text-slate-300 flex flex-col justify-center">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No hay eventos en el rango seleccionado.</p>
        <p className="mt-1 text-xs">Puedes crear uno haciendo click en un dia del panel lateral.</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 surface-panel rounded-2xl sm:rounded-[1.5rem] overflow-hidden grid grid-cols-1 lg:grid-cols-[250px_1fr]">
      <div className="border-b lg:border-b-0 lg:border-r border-orion-border dark:border-orion-dark-border overflow-x-auto lg:overflow-y-auto">
        <div className="flex lg:flex-col min-w-max lg:min-w-0 divide-x lg:divide-x-0 lg:divide-y divide-orion-border dark:divide-orion-dark-border">
          {dropDays.map((day) => (
            <AgendaDropLane
              key={day.toISOString()}
              day={day}
              onClick={onDayClick}
              count={dayCountMap[format(day, "yyyy-MM-dd")] ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="max-h-full overflow-y-auto overscroll-contain">
        {sorted.map((event, index) => {
          const currentDate = new Date(event.start);
          const previousDate = index > 0 ? new Date(sorted[index - 1].start) : null;
          const showDaySeparator = !previousDate || format(previousDate, "yyyy-MM-dd") !== format(currentDate, "yyyy-MM-dd");
          const dayKey = format(currentDate, "yyyy-MM-dd");

          return (
            <div key={`${event.sourceType}:${event.id}:${event.start}`}>
              {showDaySeparator ? (
                <div className="sticky top-0 z-10 border-y border-orion-border bg-slate-50/95 px-3 py-2 backdrop-blur-sm dark:border-orion-dark-border dark:bg-slate-900/90 sm:px-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                    <span className="rounded-full border border-orion-border px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-orion-dark-border">
                      {dayCountMap[dayKey]} {dayCountMap[dayKey] === 1 ? "evento" : "eventos"}
                    </span>
                  </div>
                </div>
              ) : null}

              <DraggableAgendaEvent item={event} onClick={onEventClick} onContextMenu={onEventContextMenu} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaDropLane({ day, onClick, count }: { day: Date; onClick: (day: Date) => void; count: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${format(day, "yyyy-MM-dd")}`,
    data: { day },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={() => onClick(day)}
      className={`w-full text-left px-3 py-2.5 min-h-12 transition-colors ${
        isOver ? "bg-blue-100/70 dark:bg-blue-950/35" : "hover:bg-slate-50 dark:hover:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{format(day, "EEE", { locale: es })}</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">{format(day, "dd/MM")}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {count}
        </span>
      </div>
    </button>
  );
}

function DraggableAgendaEvent({
  item,
  onClick,
  onContextMenu,
}: {
  item: CalendarEventItem;
  onClick: (event: CalendarEventItem) => void;
  onContextMenu: (event: CalendarEventItem, x: number, y: number) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
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
      className={`w-full text-left border-b border-orion-border/60 px-3 py-3 transition-colors dark:border-orion-dark-border/60 sm:px-4 ${
        item.canReschedule ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="rounded-xl border border-orion-border bg-white px-3 py-2.5 hover:bg-slate-50 dark:border-orion-dark-border dark:bg-slate-900 dark:hover:bg-slate-800/80">
        <div className="flex items-start gap-2">
          <div
            className="mt-0.5 h-9 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: item.sourceType === "event" ? (item.color ?? "#2563eb") : "#94a3b8" }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {item.allDay
                  ? "Todo el dia"
                  : `${format(new Date(item.start), "HH:mm", { locale: es })} - ${format(new Date(item.end), "HH:mm", { locale: es })}`}
              </span>
              {item.isReadOnly ? (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  Solo lectura
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-300">{item.calendarName || item.projectName || "Sin fuente"}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
