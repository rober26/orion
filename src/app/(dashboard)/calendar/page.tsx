"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import CalendarEvent from "@/src/components/calendar/CalendarEvent";
import type { CalendarEventItem, CalendarProjectItem, CalendarView } from "@/src/components/calendar/types";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [projects, setProjects] = useState<CalendarProjectItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<CalendarEventItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadEvents = useCallback(async (): Promise<CalendarEventItem[]> => {
    const range = getViewDateRange(currentMonth, view);
    const query = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      view,
    });

    const response = await fetch(`/api/calendar/events?${query.toString()}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar los eventos");
    }

    return (data as CalendarEventItem[]) || [];
  }, [currentMonth, view]);

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

  return (
    <div className="p-8 h-calc(100vh-20px) flex flex-col max-w-[1600px] mx-auto w-full">
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

      <EventModal
        open={isModalOpen}
        projects={projects}
        initialDate={selectedDate}
        editingEvent={editingEvent}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchEvents}
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
