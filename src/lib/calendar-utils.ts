import { 
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarView } from "@/src/components/calendar/types";

export const getCalendarDays = (date: Date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: startDate, end: endDate });
};

export const formatMonth = (date: Date) => {
  return format(date, "MMMM yyyy", { locale: es });
};

export function getViewDateRange(anchor: Date, view: CalendarView): { from: Date; to: Date } {
  if (view === "day") {
    return {
      from: startOfDay(anchor),
      to: endOfDay(anchor),
    };
  }

  if (view === "week") {
    return {
      from: startOfWeek(anchor, { weekStartsOn: 1 }),
      to: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }

  if (view === "agenda") {
    return {
      from: startOfDay(anchor),
      to: endOfDay(addDays(anchor, 30)),
    };
  }

  return {
    from: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    to: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  };
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEE d MMM", { locale: es });
}

export function formatHourLabel(date: Date): string {
  return format(date, "HH:mm", { locale: es });
}

export function eventIntersectsDay(start: Date, end: Date, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return start <= dayEnd && end >= dayStart;
}

export function isEventStartOnDay(start: Date, day: Date): boolean {
  return isSameDay(start, day);
}

export function getMonthOpacityClass(day: Date, month: Date): string {
  return isSameMonth(day, month) ? "" : "opacity-35";
}
