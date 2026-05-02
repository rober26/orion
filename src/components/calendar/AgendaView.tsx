"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { addDays, startOfDay } from "date-fns";
import { format } from "date-fns";
import type { CalendarEventItem } from "@/src/components/calendar/types";

interface AgendaViewProps {
  anchorDate: Date;
  events: CalendarEventItem[];
  onEventClick: (event: CalendarEventItem) => void;
}

export default function AgendaView({ anchorDate, events, onEventClick }: AgendaViewProps) {
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const dropDays = Array.from({ length: 7 }, (_, index) => addDays(startOfDay(anchorDate), index));

  if (sorted.length === 0) {
    return (
      <div className="flex-1 surface-panel rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 text-sm text-slate-500 dark:text-slate-300">
        No hay eventos en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="flex-1 surface-panel rounded-2xl sm:rounded-[2rem] overflow-hidden grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-0">
      <div className="border-b lg:border-b-0 lg:border-r border-orion-border dark:border-orion-dark-border divide-y divide-orion-border dark:divide-orion-dark-border overflow-x-auto lg:overflow-visible">
        {dropDays.map((day) => (
          <AgendaDropLane key={day.toISOString()} day={day} />
        ))}
      </div>

      <div className="divide-y divide-orion-border dark:divide-orion-dark-border max-h-full overflow-y-auto">
        {sorted.map((event) => (
          <DraggableAgendaEvent key={`${event.sourceType}:${event.id}`} item={event} onClick={onEventClick} />
        ))}
      </div>
    </div>
  );
}

function AgendaDropLane({ day }: { day: Date }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${format(day, "yyyy-MM-dd")}`,
    data: { day },
  });

  return (
    <div ref={setNodeRef} className={`px-3 py-2.5 min-h-12 ${isOver ? "bg-orion-primary/10" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{format(day, "EEEE")}</p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{format(day, "dd/MM")}</p>
    </div>
  );
}

function DraggableAgendaEvent({
  item,
  onClick,
}: {
  item: CalendarEventItem;
  onClick: (event: CalendarEventItem) => void;
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
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
        item.canReschedule ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      {...attributes}
      {...listeners}
    >
      <p className="text-xs text-slate-400">
        {format(new Date(item.start), "dd/MM HH:mm")} - {format(new Date(item.end), "HH:mm")}
      </p>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-300">{item.calendarName || item.projectName || "Sin fuente"}</p>
    </button>
  );
}
