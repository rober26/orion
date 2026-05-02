"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from "date-fns";
import { getCalendarDays, getViewDateRange } from "@/src/lib/calendar-utils";
import { moveEventToDay, moveEventToHour } from "@/src/components/calendar/drag-utils";
import CalendarHeader from "@/src/components/calendar/CalendarHeader";
import MonthView from "@/src/components/calendar/MonthView";
import WeekView from "@/src/components/calendar/WeekView";
import DayView from "@/src/components/calendar/DayView";
import AgendaView from "@/src/components/calendar/AgendaView";
import EventModal from "@/src/components/calendar/EventModal";
import EventDetailsDrawer from "@/src/components/calendar/EventDetailsDrawer";
import CalendarShareModal from "@/src/components/calendar/CalendarShareModal";
import CalendarManagerModal from "@/src/components/calendar/CalendarManagerModal";
import CalendarEvent from "@/src/components/calendar/CalendarEvent";
import type { CalendarEventItem, CalendarProjectItem, CalendarView, UserCalendarItem } from "@/src/components/calendar/types";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [projects, setProjects] = useState<CalendarProjectItem[]>([]);
  const [calendars, setCalendars] = useState<UserCalendarItem[]>([]);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
  const [includeTaskLayer, setIncludeTaskLayer] = useState(true);
  const [includeProjectLayer, setIncludeProjectLayer] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<CalendarEventItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const hasHydratedSettings = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadEvents = useCallback(async (): Promise<CalendarEventItem[]> => {
    const range = getViewDateRange(currentMonth, view);
    const query = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      view,
      includeTasks: String(includeTaskLayer),
      includeProjects: String(includeProjectLayer),
    });

    if (visibleCalendarIds.length > 0) {
      query.set("calendarIds", visibleCalendarIds.join(","));
    }

    const response = await fetch(`/api/calendar/events?${query.toString()}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar los eventos");
    }

    return (data as CalendarEventItem[]) || [];
  }, [currentMonth, includeProjectLayer, includeTaskLayer, view, visibleCalendarIds]);

  const loadCalendars = useCallback(async (): Promise<UserCalendarItem[]> => {
    const response = await fetch("/api/calendars", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar los calendarios");
    }

    return (data as UserCalendarItem[]) || [];
  }, []);

  const loadSettings = useCallback(async (): Promise<{
    visibleCalendarIds: string[] | null;
    includeTaskLayer: boolean;
    includeProjectLayer: boolean;
  }> => {
    const response = await fetch("/api/calendars/settings", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar preferencias");
    }

    return {
      visibleCalendarIds: Array.isArray(data.visibleCalendarIds) ? (data.visibleCalendarIds as string[]) : null,
      includeTaskLayer: data.includeTaskLayer !== false,
      includeProjectLayer: data.includeProjectLayer !== false,
    };
  }, []);

  const persistSettings = useCallback(
    async (payload: {
      visibleCalendarIds?: string[] | null;
      includeTaskLayer?: boolean;
      includeProjectLayer?: boolean;
    }) => {
      await fetch("/api/calendars/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    [],
  );

  const loadProjects = useCallback(async (): Promise<CalendarProjectItem[]> => {
    const response = await fetch("/api/projects?status=active", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar proyectos");
    }

    return (data as Array<{ id: string; name: string; color: string | null }>).map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
    }));
  }, []);

  const fetchEvents = useCallback(async () => {
    const nextEvents = await loadEvents();
    setEvents(nextEvents);
  }, [loadEvents]);

  const moveCalendarItem = useCallback(
    async (item: CalendarEventItem, payload: { start: string; end: string; allDay: boolean }) => {
      if (!item.canReschedule) {
        return;
      }

      const response = await fetch(`/api/calendar/items/${item.sourceType}/${item.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: item.projectId,
          calendarId: item.calendarId,
          start: payload.start,
          end: payload.end,
          allDay: payload.allDay,
          dueDate: payload.start,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo mover el elemento");
      }

      await fetchEvents();
    },
    [fetchEvents],
  );

  const parseDropTarget = (id: string): { type: "day"; day: Date } | { type: "hour"; day: Date; hour: number } | null => {
    if (id.startsWith("day:")) {
      const rawDay = id.slice(4);
      const day = new Date(`${rawDay}T00:00:00`);
      if (Number.isNaN(day.getTime())) {
        return null;
      }
      return { type: "day", day };
    }

    if (id.startsWith("hour:")) {
      const parts = id.split(":");
      if (parts.length !== 3) {
        return null;
      }

      const day = new Date(`${parts[1]}T00:00:00`);
      const hour = Number(parts[2]);
      if (Number.isNaN(day.getTime()) || Number.isNaN(hour)) {
        return null;
      }

      return { type: "hour", day, hour };
    }

    return null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    if (!event.over || !event.active.data.current) {
      return;
    }

    const item = event.active.data.current.item as CalendarEventItem | undefined;
    if (!item || !item.canReschedule) {
      return;
    }

    const target = parseDropTarget(String(event.over.id));
    if (!target) {
      return;
    }

    try {
      if (target.type === "day") {
        const moved = moveEventToDay(item, target.day);
        await moveCalendarItem(item, {
          start: moved.start.toISOString(),
          end: moved.end.toISOString(),
          allDay: moved.allDay,
        });
        return;
      }

      const moved = moveEventToHour(item, target.day, target.hour);
      await moveCalendarItem(item, {
        start: moved.start.toISOString(),
        end: moved.end.toISOString(),
        allDay: moved.allDay,
      });
    } catch {
      await fetchEvents();
    }
  };

  useEffect(() => {
    void loadEvents()
      .then((nextEvents) => setEvents(nextEvents))
      .catch(() => setEvents([]));
  }, [loadEvents]);

  useEffect(() => {
    void loadProjects()
      .then((nextProjects) => setProjects(nextProjects))
      .catch(() => setProjects([]));
  }, [loadProjects]);

  useEffect(() => {
    void Promise.all([loadCalendars(), loadSettings()])
      .then(([items, settings]) => {
        setCalendars(items);
        setIncludeTaskLayer(settings.includeTaskLayer);
        setIncludeProjectLayer(settings.includeProjectLayer);
        setVisibleCalendarIds(() => {
          if (settings.visibleCalendarIds && settings.visibleCalendarIds.length > 0) {
            return settings.visibleCalendarIds.filter((id) => items.some((item) => item.id === id));
          }

          return items.map((item) => item.id);
        });
        hasHydratedSettings.current = true;
      })
      .catch(() => {
        setCalendars([]);
        setVisibleCalendarIds([]);
        hasHydratedSettings.current = true;
      });
  }, [loadCalendars, loadSettings]);

  useEffect(() => {
    if (!hasHydratedSettings.current) {
      return;
    }

    void persistSettings({ visibleCalendarIds });
  }, [visibleCalendarIds, persistSettings]);

  useEffect(() => {
    if (!hasHydratedSettings.current) {
      return;
    }

    void persistSettings({ includeTaskLayer });
  }, [includeTaskLayer, persistSettings]);

  useEffect(() => {
    if (!hasHydratedSettings.current) {
      return;
    }

    void persistSettings({ includeProjectLayer });
  }, [includeProjectLayer, persistSettings]);

  const onPrev = () => {
    if (view === "month") {
      setCurrentMonth((prev) => subMonths(prev, 1));
      return;
    }

    if (view === "week") {
      setCurrentMonth((prev) => subWeeks(prev, 1));
      return;
    }

    setCurrentMonth((prev) => subDays(prev, 1));
  };

  const onNext = () => {
    if (view === "month") {
      setCurrentMonth((prev) => addMonths(prev, 1));
      return;
    }

    if (view === "week") {
      setCurrentMonth((prev) => addWeeks(prev, 1));
      return;
    }

    setCurrentMonth((prev) => addDays(prev, 1));
  };

  const days = getCalendarDays(currentMonth);
  const viewContent = useMemo(() => {
    if (view === "week") {
      return <WeekView anchorDate={currentMonth} events={events} onEventClick={(event) => setSelectedEvent(event)} />;
    }

    if (view === "day") {
      return <DayView day={currentMonth} events={events} onEventClick={(event) => setSelectedEvent(event)} />;
    }

    if (view === "agenda") {
      return <AgendaView anchorDate={currentMonth} events={events} onEventClick={(event) => setSelectedEvent(event)} />;
    }

    return (
      <MonthView
        days={days}
        currentMonth={currentMonth}
        events={events}
        onDayClick={(day) => {
          setSelectedDate(day);
          setView("day");
          setCurrentMonth(day);
        }}
        onEventClick={(event) => setSelectedEvent(event)}
      />
    );
  }, [view, currentMonth, events, days]);

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendarIds((current) => {
      if (current.includes(calendarId)) {
        return current.filter((id) => id !== calendarId);
      }

      return [...current, calendarId];
    });
  };

  return (
    <div className="h-full min-h-0 max-w-[1700px] mx-auto w-full p-2 sm:p-3 lg:p-4">
      <div className="h-full min-h-0 grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-3">
        <aside className="surface-panel rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 overflow-y-auto order-2 xl:order-1">
          <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-slate-500 mb-3">Mis calendarios</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2 mb-3">
            <button
              type="button"
              className="btn-secondary w-full text-xs"
              onClick={() => setIsManagerModalOpen(true)}
            >
              Gestionar calendarios
            </button>
            <button
              type="button"
              className="btn-secondary w-full text-xs"
              onClick={() => setIsShareModalOpen(true)}
            >
              Compartir calendarios
            </button>
          </div>
        <div className="space-y-2">
          {calendars.map((calendar) => {
            const active = visibleCalendarIds.includes(calendar.id);
            return (
              <label
                key={calendar.id}
                className="flex items-center gap-2 rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2 cursor-pointer"
              >
                <input type="checkbox" checked={active} onChange={() => toggleCalendarVisibility(calendar.id)} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: calendar.color || "#2563eb" }} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">{calendar.name}</span>
                <span className="text-[10px] text-slate-500 uppercase">{calendar.visibility}</span>
              </label>
            );
          })}
        </div>

          <div className="mt-5 pt-4 border-t border-orion-border dark:border-orion-dark-border space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Capas</h3>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={includeTaskLayer} onChange={(event) => setIncludeTaskLayer(event.target.checked)} />
            Mostrar tareas
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={includeProjectLayer} onChange={(event) => setIncludeProjectLayer(event.target.checked)} />
            Mostrar hitos de proyecto
          </label>
          </div>
        </aside>

        <div className="flex flex-col min-h-0 overflow-hidden order-1 xl:order-2">
        <CalendarHeader
          currentMonth={currentMonth}
          view={view}
          onViewChange={(nextView) => setView(nextView)}
          onPrevMonth={onPrev}
          onNextMonth={onNext}
          onToday={() => setCurrentMonth(new Date())}
          onCreateEvent={() => {
            setEditingEvent(null);
            setSelectedDate(currentMonth);
            setIsModalOpen(true);
          }}
        />

        <DndContext
          sensors={sensors}
          onDragStart={(event) => {
            const item = event.active.data.current?.item as CalendarEventItem | undefined;
            setActiveDragItem(item ?? null);
          }}
          onDragEnd={(event) => void handleDragEnd(event)}
          onDragCancel={() => setActiveDragItem(null)}
        >
          {viewContent}

          <DragOverlay>
            {activeDragItem ? (
              <div className="w-56">
                <CalendarEvent
                  title={activeDragItem.title}
                  type={activeDragItem.sourceType}
                  color={activeDragItem.color || undefined}
                  draggable={activeDragItem.canReschedule}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </div>
      </div>

      <EventModal
        open={isModalOpen}
        calendars={calendars}
        projects={projects}
        initialDate={selectedDate}
        editingEvent={editingEvent}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchEvents}
      />

      <CalendarShareModal
        open={isShareModalOpen}
        calendars={calendars}
        onClose={() => setIsShareModalOpen(false)}
        onChanged={async () => {
          const items = await loadCalendars();
          setCalendars(items);
          await fetchEvents();
        }}
      />

      <CalendarManagerModal
        open={isManagerModalOpen}
        calendars={calendars}
        onClose={() => setIsManagerModalOpen(false)}
        onChanged={async () => {
          const items = await loadCalendars();
          setCalendars(items);
          setVisibleCalendarIds((current) => {
            const next = current.filter((id) => items.some((item) => item.id === id));
            return next.length > 0 ? next : items.map((item) => item.id);
          });
          await fetchEvents();
        }}
      />

      <EventDetailsDrawer
        open={selectedEvent !== null}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onRefresh={fetchEvents}
        onEdit={(event) => {
          setEditingEvent(event);
          setSelectedEvent(null);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
