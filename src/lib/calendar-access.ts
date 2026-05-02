import { AccessRole, CalendarVisibility, Prisma } from "@prisma/client";
import prisma from "@/src/lib/prisma";

const CALENDAR_OWNER_OR_EDITOR: AccessRole[] = [AccessRole.OWNER, AccessRole.EDITOR];

export function calendarAccessWhere(userId: string): Prisma.CalendarWhereInput {
  return {
    OR: [{ ownerId: userId }, { creatorId: userId }, { users: { some: { userId } } }],
  };
}

export function calendarReadWhere(userId: string): Prisma.CalendarWhereInput {
  return {
    OR: [{ visibility: CalendarVisibility.PUBLIC }, calendarAccessWhere(userId)],
  };
}

export function calendarEditorWhere(userId: string): Prisma.CalendarWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { creatorId: userId },
      { users: { some: { userId, role: { in: CALENDAR_OWNER_OR_EDITOR } } } },
    ],
  };
}

export async function canViewCalendar(calendarId: string, userId: string): Promise<boolean> {
  const calendar = await prisma.calendar.findFirst({
    where: {
      id: calendarId,
      ...calendarReadWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(calendar);
}

export async function canEditCalendarContent(calendarId: string, userId: string): Promise<boolean> {
  const calendar = await prisma.calendar.findFirst({
    where: {
      id: calendarId,
      ...calendarEditorWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(calendar);
}

export async function ensureDefaultCalendar(userId: string): Promise<{ id: string; name: string; color: string | null }> {
  const existing = await prisma.calendar.findFirst({
    where: {
      ownerId: userId,
      isDefault: true,
    },
    select: { id: true, name: true, color: true },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.calendar.create({
    data: {
      name: "Personal",
      color: "#2563eb",
      visibility: "PRIVATE",
      isDefault: true,
      ownerId: userId,
      creatorId: userId,
    },
    select: { id: true, name: true, color: true },
  });

  return created;
}
