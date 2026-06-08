"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from "date-fns";
import { MoreVertical, X } from "lucide-react";
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
import ContextMenu from "@/src/components/ui/ContextMenu";
import type { CalendarEventItem, CalendarProjectItem, CalendarView, UserCalendarItem } from "@/src/components/calendar/types";

const CALENDAR_COLOR_PRESETS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
] as const;

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [hasLoadedEventsOnce, setHasLoadedEventsOnce] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<CalendarProjectItem[]>([]);
  const [calendars, setCalendars] = useState<UserCalendarItem[]>([]);
  const [isCalendarsLoading, setIsCalendarsLoading] = useState(true);
  const [calendarsError, setCalendarsError] = useState<string | null>(null);
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
  const [isCalendarsOpen, setIsCalendarsOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextEvent, setContextEvent] = useState<CalendarEventItem | null>(null);
  const [calendarMenuPosition, setCalendarMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextCalendar, setContextCalendar] = useState<UserCalendarItem | null>(null);
  const [createMenuPosition, setCreateMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [createMenuDate, setCreateMenuDate] = useState<Date | null>(null);
  const [managerInitialCalendarId, setManagerInitialCalendarId] = useState<string | null>(null);
  const [shareInitialCalendarId, setShareInitialCalendarId] = useState<string | null>(null);
  const [colorTargetCalendarId, setColorTargetCalendarId] = useState<string | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const hasHydratedSettings = useRef(false);
  const initialProjectId = useMemo(() => {
    const projectId = searchParams.get("projectId")?.trim();
    return projectId || null;
  }, [searchParams]);

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

    const raw = (data as CalendarEventItem[]) || [];

    return raw.filter((item) => {
      if (item.sourceType === "event") {
        if (!item.calendarId) {
          return Boolean(item.projectId);
        }

        return visibleCalendarIds.includes(item.calendarId);
      }

      if (item.sourceType === "task") {
        return includeTaskLayer;
      }

      if (item.sourceType === "project") {
        return includeProjectLayer;
      }

      return true;
    });
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
    setIsEventsLoading(true);
    setEventsError(null);
    try {
      const nextEvents = await loadEvents();
      setEvents(nextEvents);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "No se pudieron cargar los eventos");
    } finally {
      setHasLoadedEventsOnce(true);
      setIsEventsLoading(false);
    }
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
    },
    [],
  );

  const parseDateFromDropId = (rawDay: string): Date | null => {
    const [year, month, day] = rawDay.split("-").map((value) => Number(value));
    if (!year || !month || !day) {
      return null;
    }

    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  };

  const parseDropTarget = (id: string): { type: "day"; day: Date } | { type: "hour"; day: Date; hour: number } | null => {
    if (id.startsWith("day:")) {
      const rawDay = id.slice(4);
      const day = parseDateFromDropId(rawDay);
      if (!day) {
        return null;
      }
      return { type: "day", day };
    }

    if (id.startsWith("hour:")) {
      const parts = id.split(":");
      if (parts.length !== 3) {
        return null;
      }

      const day = parseDateFromDropId(parts[1]);
      const hour = Number(parts[2]);
      if (!day || Number.isNaN(hour)) {
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

    const moved = target.type === "day" ? moveEventToDay(item, target.day) : moveEventToHour(item, target.day, target.hour);

    const payload = {
      start: moved.start.toISOString(),
      end: moved.end.toISOString(),
      allDay: moved.allDay,
    };

    const previousEvents = events;
    setEvents((current) =>
      current.map((entry) =>
        entry.id === item.id && entry.sourceType === item.sourceType
          ? { ...entry, start: payload.start, end: payload.end, allDay: payload.allDay }
          : entry,
      ),
    );

    try {
      await moveCalendarItem(item, payload);
    } catch {
      setEvents(previousEvents);
      await fetchEvents();
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!contextEvent) {
      return;
    }

    const close = () => {
      setContextEvent(null);
      setContextMenuPosition(null);
    };

    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextEvent]);

  useEffect(() => {
    if (!createMenuDate) {
      return;
    }

    const close = () => {
      setCreateMenuDate(null);
      setCreateMenuPosition(null);
    };

    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [createMenuDate]);

  useEffect(() => {
    if (!contextCalendar) {
      return;
    }

    const close = () => {
      setContextCalendar(null);
      setCalendarMenuPosition(null);
    };

    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextCalendar]);

  useEffect(() => {
    void loadProjects()
      .then((nextProjects) => setProjects(nextProjects))
      .catch(() => setProjects([]));
  }, [loadProjects]);

  useEffect(() => {
    void Promise.all([loadCalendars(), loadSettings()])
      .then(([items, settings]) => {
        setCalendarsError(null);
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
        setIsCalendarsLoading(false);
      })
      .catch((error) => {
        setCalendars([]);
        setVisibleCalendarIds([]);
        setCalendarsError(error instanceof Error ? error.message : "No se pudieron cargar calendarios");
        hasHydratedSettings.current = true;
        setIsCalendarsLoading(false);
      });
  }, [loadCalendars, loadSettings]);

  useEffect(() => {
    if (!hasHydratedSettings.current) {
      return;
    }

    const timeout = setTimeout(() => {
      void persistSettings({ visibleCalendarIds, includeTaskLayer, includeProjectLayer });
    }, 250);

    return () => clearTimeout(timeout);
  }, [visibleCalendarIds, includeTaskLayer, includeProjectLayer, persistSettings]);

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

  const openCreateModalAtDate = useCallback((date: Date) => {
    setContextEvent(null);
    setContextMenuPosition(null);
    setContextCalendar(null);
    setCalendarMenuPosition(null);
    setCreateMenuDate(null);
    setCreateMenuPosition(null);
    setEditingEvent(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);

  const openCreateContextMenu = useCallback((date: Date, x: number, y: number) => {
    setContextEvent(null);
    setContextMenuPosition(null);
    setContextCalendar(null);
    setCalendarMenuPosition(null);
    setCreateMenuDate(date);
    setCreateMenuPosition({ x, y });
  }, []);

  const openDayViewAtDate = useCallback((date: Date) => {
    setCurrentMonth(new Date(date));
    setView("day");
    setSelectedEvent(null);
    setContextEvent(null);
    setContextMenuPosition(null);
    setContextCalendar(null);
    setCalendarMenuPosition(null);
    setCreateMenuDate(null);
    setCreateMenuPosition(null);
  }, []);

  const openEventContextMenu = useCallback((item: CalendarEventItem, x: number, y: number) => {
    if (item.sourceType !== "event" || item.isReadOnly) {
      return;
    }

    setContextEvent(item);
    setContextMenuPosition({ x, y });
  }, []);

  const closeEventContextMenu = useCallback(() => {
    setContextEvent(null);
    setContextMenuPosition(null);
  }, []);

  const openCalendarContextMenu = useCallback((calendar: UserCalendarItem, x: number, y: number) => {
    setContextEvent(null);
    setContextMenuPosition(null);
    setContextCalendar(calendar);
    setCalendarMenuPosition({ x, y });
  }, []);

  const closeCalendarContextMenu = useCallback(() => {
    setContextCalendar(null);
    setCalendarMenuPosition(null);
  }, []);

  const configureCalendarFromContextMenu = useCallback(() => {
    if (!contextCalendar) {
      return;
    }

    if (contextCalendar.role !== "OWNER") {
      closeCalendarContextMenu();
      return;
    }

    setManagerInitialCalendarId(contextCalendar.id);
    setIsCalendarsOpen(false);
    setIsManagerModalOpen(true);
    closeCalendarContextMenu();
  }, [closeCalendarContextMenu, contextCalendar]);

  const shareCalendarFromContextMenu = useCallback(() => {
    if (!contextCalendar) {
      return;
    }

    if (contextCalendar.role !== "OWNER") {
      closeCalendarContextMenu();
      return;
    }

    setShareInitialCalendarId(contextCalendar.id);
    setIsCalendarsOpen(false);
    setIsShareModalOpen(true);
    closeCalendarContextMenu();
  }, [closeCalendarContextMenu, contextCalendar]);

  const changeCalendarColor = useCallback(
    async (calendarId: string, color: string) => {
      const normalizedColor = color.trim();
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalizedColor)) {
        return;
      }

      const previousCalendars = calendars;
      const previousEvents = events;

      try {
        setCalendars((current) => current.map((item) => (item.id === calendarId ? { ...item, color: normalizedColor } : item)));
        setEvents((current) =>
          current.map((item) =>
            item.sourceType === "event" && item.calendarId === calendarId ? { ...item, color: normalizedColor } : item,
          ),
        );

        const response = await fetch(`/api/calendars/${calendarId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: normalizedColor }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo actualizar el color");
        }
      } catch (error) {
        setCalendars(previousCalendars);
        setEvents(previousEvents);
        setEventsError(error instanceof Error ? error.message : "No se pudo actualizar el color del calendario");
      }
    },
    [calendars, events],
  );

  const openColorPickerFromContextMenu = useCallback(() => {
    if (!contextCalendar || contextCalendar.role !== "OWNER") {
      closeCalendarContextMenu();
      return;
    }

    setColorTargetCalendarId(contextCalendar.id);
    closeCalendarContextMenu();

    requestAnimationFrame(() => {
      const colorInput = colorInputRef.current;
      if (!colorInput) {
        return;
      }

      colorInput.value = contextCalendar.color || "#2563eb";
      colorInput.click();
    });
  }, [closeCalendarContextMenu, contextCalendar]);

  const editFromContextMenu = useCallback(() => {
    if (!contextEvent) {
      return;
    }

    closeEventContextMenu();
    setEditingEvent(contextEvent);
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, [closeEventContextMenu, contextEvent]);

  const deleteFromContextMenu = useCallback(async () => {
    if (!contextEvent || contextEvent.sourceType !== "event" || contextEvent.isReadOnly) {
      return;
    }

    if (!window.confirm("¿Eliminar este evento?")) {
      return;
    }

    closeEventContextMenu();
    try {
      const response = await fetch(`/api/calendar/events/${contextEvent.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar");
      }

      await fetchEvents();
      if (selectedEvent?.id === contextEvent.id && selectedEvent.sourceType === contextEvent.sourceType) {
        setSelectedEvent(null);
      }
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "No se pudo eliminar el evento");
    }
  }, [closeEventContextMenu, contextEvent, fetchEvents, selectedEvent]);

  const days = getCalendarDays(currentMonth);
  const viewContent = useMemo(() => {
    if (view === "week") {
      return (
        <WeekView
          anchorDate={currentMonth}
          events={events}
          onEventClick={(event) => setSelectedEvent(event)}
          onSlotClick={(day, hour) => {
            const date = new Date(day);
            date.setHours(hour, 0, 0, 0);
            openCreateModalAtDate(date);
          }}
          onSlotContextMenu={(day, hour, x, y) => {
            const date = new Date(day);
            date.setHours(hour, 0, 0, 0);
            openCreateContextMenu(date, x, y);
          }}
          onEventContextMenu={openEventContextMenu}
        />
      );
    }

    if (view === "day") {
      return (
        <DayView
          day={currentMonth}
          events={events}
          onEventClick={(event) => setSelectedEvent(event)}
          onSlotClick={(day, hour) => {
            const date = new Date(day);
            date.setHours(hour, 0, 0, 0);
            openCreateModalAtDate(date);
          }}
          onSlotContextMenu={(day, hour, x, y) => {
            const date = new Date(day);
            date.setHours(hour, 0, 0, 0);
            openCreateContextMenu(date, x, y);
          }}
          onEventContextMenu={openEventContextMenu}
        />
      );
    }

    if (view === "agenda") {
      return (
        <AgendaView
          anchorDate={currentMonth}
          events={events}
          onEventClick={(event) => setSelectedEvent(event)}
          onDayClick={(day) => openDayViewAtDate(day)}
          onDayContextMenu={(day, x, y) => openCreateContextMenu(day, x, y)}
          onEventContextMenu={openEventContextMenu}
        />
      );
    }

    return (
      <MonthView
        days={days}
        currentMonth={currentMonth}
        events={events}
        onDayClick={(day) => openDayViewAtDate(day)}
        onDayContextMenu={(day, x, y) => openCreateContextMenu(day, x, y)}
        onEventClick={(event) => setSelectedEvent(event)}
        onEventContextMenu={openEventContextMenu}
      />
    );
  }, [view, currentMonth, events, days, openCreateContextMenu, openCreateModalAtDate, openDayViewAtDate, openEventContextMenu]);

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendarIds((current) => {
      if (current.includes(calendarId)) {
        return current.filter((id) => id !== calendarId);
      }

      return [...current, calendarId];
    });
  };

  return (
    <div className="app-page overflow-hidden">
      <div className="app-page-content max-w-none p-0 h-full min-h-0 flex flex-col gap-1.5 sm:gap-2">
        {eventsError ? (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {eventsError}
          </div>
        ) : null}

        {calendarsError ? (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {calendarsError}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 min-w-0 overflow-hidden px-1 pb-1 sm:px-0 sm:pb-0">
          <section className="section-panel h-full flex-1 p-2 sm:p-2.5 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
            <CalendarHeader
              currentMonth={currentMonth}
              view={view}
              onViewChange={(nextView) => setView(nextView)}
              onPrevMonth={onPrev}
              onNextMonth={onNext}
              onToday={() => setCurrentMonth(new Date())}
              onAddEvent={() => openCreateModalAtDate(new Date(currentMonth))}
              onToggleCalendars={() => setIsCalendarsOpen((current) => !current)}
              isCalendarsOpen={isCalendarsOpen}
            />

            {isEventsLoading && !hasLoadedEventsOnce ? (
              <div className="flex-1 rounded-3xl border border-orion-border dark:border-orion-dark-border p-4 sm:p-5 space-y-2">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div
                className={`relative flex flex-1 min-h-0 min-w-0 overflow-hidden transition-opacity duration-200 ${
                  isEventsLoading ? "opacity-85" : "opacity-100"
                }`}
              >
                <DndContext
                  sensors={sensors}
                  onDragStart={(event) => {
                    const item = event.active.data.current?.item as CalendarEventItem | undefined;
                    setActiveDragItem(item ?? null);
                  }}
                  onDragEnd={(event) => void handleDragEnd(event)}
                  onDragCancel={() => setActiveDragItem(null)}
                >
                  <div className="h-full min-h-0 w-full">
                    {viewContent}
                  </div>

                  {isEventsLoading ? (
                    <div className="pointer-events-none absolute right-5 top-4 h-2 w-24 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-orion-primary" />
                    </div>
                  ) : null}

                  <DragOverlay dropAnimation={null}>
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

                <aside
                  className={`motion-panel absolute inset-y-1 right-1 z-30 w-[min(92vw,320px)] max-h-[calc(100%-0.5rem)] overflow-hidden rounded-2xl border border-orion-border bg-white p-2 shadow-2xl transition-all duration-300 dark:border-orion-dark-border dark:bg-slate-900 ${
                    isCalendarsOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[104%] opacity-0"
                  }`}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-orion-border dark:border-orion-dark-border">
                    <h2 className="text-xs font-black tracking-widest uppercase text-slate-500">Mis calendarios</h2>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn-primary !px-2 !py-1 !text-[10px]"
                        onClick={() => {
                          setManagerInitialCalendarId(null);
                          setIsCalendarsOpen(false);
                          setIsManagerModalOpen(true);
                        }}
                      >
                        Anadir calendario
                      </button>
                      <button
                        type="button"
                        className="btn-secondary inline-flex h-8 w-8 items-center justify-center p-0"
                        onClick={() => setIsCalendarsOpen(false)}
                        aria-label="Cerrar panel de calendarios"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {isCalendarsLoading ? (
                    <div className="mt-3 space-y-2">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 max-h-[40dvh] overflow-y-auto pr-1">
                          {calendars.map((calendar) => {
                            const active = visibleCalendarIds.includes(calendar.id);
                            const isOwner = calendar.role === "OWNER";
                            const isProjectCalendar = Boolean(calendar.projectId);
                            return (
                          <div
                            key={calendar.id}
                            className="flex items-center gap-2 rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2"
                            onContextMenu={(event) => {
                              event.preventDefault();
                              openCalendarContextMenu(calendar, event.clientX, event.clientY);
                            }}
                          >
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                              <input type="checkbox" checked={active} onChange={() => toggleCalendarVisibility(calendar.id)} />
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: calendar.color || "#1e3a8a" }} />
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">{calendar.name}</span>
                            </label>
                            <span className="text-[10px] text-slate-500 uppercase">{calendar.visibility}</span>
                            <button
                              type="button"
                              disabled={isProjectCalendar}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              aria-label={`Opciones de ${calendar.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (isProjectCalendar) {
                                  return;
                                }
                                openCalendarContextMenu(calendar, event.clientX, event.clientY);
                              }}
                              title={isProjectCalendar ? "Los calendarios de proyecto se gestionan desde el proyecto" : isOwner ? "Configurar o compartir" : "Solo el propietario puede gestionar este calendario"}
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-orion-border dark:border-orion-dark-border space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Capas</h3>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={includeTaskLayer} onChange={(event) => setIncludeTaskLayer(event.target.checked)} />
                      Mostrar tareas
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeProjectLayer}
                        onChange={(event) => setIncludeProjectLayer(event.target.checked)}
                      />
                      Mostrar proyectos
                    </label>
                  </div>
                </aside>

                <ContextMenu
                  open={contextEvent !== null && contextMenuPosition !== null}
                  position={contextMenuPosition}
                  onRequestClose={closeEventContextMenu}
                  items={[
                    {
                      label: "Editar",
                      onSelect: () => {
                        editFromContextMenu();
                      },
                    },
                    {
                      label: "Eliminar",
                      tone: "danger",
                      onSelect: () => {
                        void deleteFromContextMenu();
                      },
                    },
                  ]}
                />

                <ContextMenu
                  open={createMenuDate !== null && createMenuPosition !== null}
                  position={createMenuPosition}
                  onRequestClose={() => {
                    setCreateMenuDate(null);
                    setCreateMenuPosition(null);
                  }}
                  items={[
                    {
                      label: "Anadir evento",
                      onSelect: () => {
                        if (!createMenuDate) {
                          return;
                        }
                        openCreateModalAtDate(createMenuDate);
                      },
                    },
                  ]}
                />

                <ContextMenu
                  open={contextCalendar !== null && calendarMenuPosition !== null}
                  position={calendarMenuPosition}
                  onRequestClose={closeCalendarContextMenu}
                  extraContent={
                    contextCalendar ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Color del calendario</p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {CALENDAR_COLOR_PRESETS.map((preset) => {
                            const selectedColor = (contextCalendar.color || "#2563eb").toLowerCase();
                            const isSelected = selectedColor === preset.toLowerCase();
                            const disabled = contextCalendar.role !== "OWNER";

                            return (
                              <button
                                key={preset}
                                type="button"
                                disabled={disabled}
                                title={disabled ? "Solo el propietario puede cambiar el color" : `Elegir ${preset}`}
                                onClick={() => {
                                  if (disabled) {
                                    return;
                                  }
                                  void changeCalendarColor(contextCalendar.id, preset);
                                  closeCalendarContextMenu();
                                }}
                                className={`h-6 w-6 rounded-full border transition-transform ${
                                  isSelected ? "border-white ring-1 ring-white" : "border-white/30"
                                } ${disabled ? "cursor-not-allowed opacity-50" : "hover:scale-105"}`}
                                style={{ backgroundColor: preset }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : null
                  }
                  items={[
                    {
                      label: "Configurar calendario",
                      disabled: contextCalendar?.role !== "OWNER",
                      hint: contextCalendar?.role !== "OWNER" ? "Solo el propietario puede configurar" : undefined,
                      onSelect: () => {
                        configureCalendarFromContextMenu();
                      },
                    },
                    {
                      label: "Compartir calendario",
                      disabled: contextCalendar?.role !== "OWNER",
                      hint: contextCalendar?.role !== "OWNER" ? "Solo el propietario puede compartir" : undefined,
                      onSelect: () => {
                        shareCalendarFromContextMenu();
                      },
                    },
                    {
                      label: "Cambiar color",
                      disabled: contextCalendar?.role !== "OWNER",
                      hint: contextCalendar?.role !== "OWNER" ? "Solo el propietario puede cambiar el color" : undefined,
                      onSelect: () => {
                        openColorPickerFromContextMenu();
                      },
                    },
                  ]}
                />

                <input
                  ref={colorInputRef}
                  type="color"
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(event) => {
                    if (!colorTargetCalendarId) {
                      return;
                    }

                    void changeCalendarColor(colorTargetCalendarId, event.target.value);
                    setColorTargetCalendarId(null);
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <EventModal
        open={isModalOpen}
        calendars={calendars}
        projects={projects}
        initialDate={selectedDate}
        initialProjectId={initialProjectId}
        lockProjectSelection={Boolean(initialProjectId)}
        editingEvent={editingEvent}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchEvents}
      />

      <CalendarShareModal
        open={isShareModalOpen}
        calendars={calendars}
        initialCalendarId={shareInitialCalendarId}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareInitialCalendarId(null);
        }}
        onChanged={async () => {
          const items = await loadCalendars();
          setCalendars(items);
          await fetchEvents();
        }}
      />

      <CalendarManagerModal
        open={isManagerModalOpen}
        calendars={calendars}
        initialCalendarId={managerInitialCalendarId}
        allowCreate
        onClose={() => {
          setIsManagerModalOpen(false);
          setManagerInitialCalendarId(null);
        }}
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
