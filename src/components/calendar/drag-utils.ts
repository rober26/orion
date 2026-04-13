import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import type { CalendarEventItem } from "@/src/components/calendar/types";

export function getEventDurationMs(item: CalendarEventItem): number {
  const start = new Date(item.start).getTime();
  const end = new Date(item.end).getTime();
  return Math.max(end - start, 0);
}

export function moveEventToDay(item: CalendarEventItem, day: Date): { start: Date; end: Date; allDay: boolean } {
  const start = new Date(item.start);
  const durationMs = getEventDurationMs(item);

  if (item.allDay || item.sourceType === "task") {
    const nextStart = startOfDay(day);
    return {
      start: nextStart,
      end: nextStart,
      allDay: true,
    };
  }

  const base = startOfDay(day);
  const nextStart = setMinutes(setHours(base, start.getHours()), start.getMinutes());
  return {
    start: nextStart,
    end: new Date(nextStart.getTime() + durationMs),
    allDay: false,
  };
}

export function moveEventToHour(item: CalendarEventItem, day: Date, hour: number): { start: Date; end: Date; allDay: boolean } {
  const base = startOfDay(day);
  const nextStart = setHours(base, hour);
  nextStart.setMinutes(0, 0, 0);

  if (item.allDay || item.sourceType === "task") {
    return {
      start: nextStart,
      end: nextStart,
      allDay: true,
    };
  }

  const durationMs = getEventDurationMs(item);
  const effectiveDuration = durationMs > 0 ? durationMs : 0;

  return {
    start: nextStart,
    end: new Date(nextStart.getTime() + effectiveDuration),
    allDay: false,
  };
}

export function getDropDateFromAgendaIndex(anchor: Date, index: number): Date {
  const base = startOfDay(anchor);
  return addDays(base, index);
}
