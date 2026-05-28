import { ResponseStatus } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
import { canEditCalendarContent, canViewCalendar } from "@/src/lib/calendar-access";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";
import { invalidSessionResponse } from "@/src/lib/calendar/errors";

type RouteParams = { params: Promise<{ id: string }> };

const EVENT_TITLE_MAX_LENGTH = 100;

async function canViewEvent(eventId: string, actorUserId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      projectId: true,
      calendarId: true,
      users: {
        where: { userId: actorUserId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!event) {
    return false;
  }

  if (event.users.length > 0) {
    return true;
  }

  if (event.projectId && (await canViewProject(event.projectId, actorUserId))) {
    return true;
  }

  if (event.calendarId && (await canViewCalendar(event.calendarId, actorUserId))) {
    return true;
  }

  return false;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return invalidSessionResponse();
    }

    const { id } = await params;
    if (!(await canViewEvent(id, actorUserId))) {
      return forbidden();
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        isAllDay: true,
        projectId: true,
        calendarId: true,
        creatorId: true,
        project: { select: { name: true, color: true } },
        calendar: { select: { name: true, color: true } },
        users: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { user: { username: "asc" } },
        },
      },
    });

    if (!event) {
      return badRequest("Evento no encontrado");
    }

    const canEdit =
      (event.projectId ? await canEditProjectContent(event.projectId, actorUserId) : false) ||
      (event.calendarId ? await canEditCalendarContent(event.calendarId, actorUserId) : false);

    return json({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start: event.startDate,
      end: event.endDate,
      allDay: event.isAllDay,
      sourceType: "event",
      projectId: event.projectId,
      projectName: event.project?.name ?? null,
      calendarId: event.calendarId,
      calendarName: event.calendar?.name ?? null,
      color: event.calendar?.color ?? event.project?.color ?? null,
      isReadOnly: !canEdit,
      canReschedule: canEdit,
      creatorId: event.creatorId,
      attendees: event.users.map((member) => ({
        user: member.user,
        responseStatus: member.responseStatus,
      })),
      myResponseStatus:
        event.users.find((member) => member.userId === actorUserId)?.responseStatus ?? ResponseStatus.PENDING,
    });
  } catch (error) {
    console.error("GET_CALENDAR_EVENT_DETAIL_ERROR", error);
    return serverError("No se pudo cargar el evento");
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return invalidSessionResponse();
    }

    const { id } = await params;

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, projectId: true, calendarId: true, startDate: true, endDate: true },
    });

    if (!existing) {
      return badRequest("Evento no encontrado");
    }

    const canEdit =
      (existing.projectId ? await canEditProjectContent(existing.projectId, actorUserId) : false) ||
      (existing.calendarId ? await canEditCalendarContent(existing.calendarId, actorUserId) : false);

    if (!canEdit) {
      return forbidden();
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      location?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      isAllDay?: unknown;
    };

    const nextTitle = typeof body.title === "string" ? body.title.trim() : undefined;
    const nextDescription = typeof body.description === "string" ? body.description.trim() : undefined;
    const nextLocation = typeof body.location === "string" ? body.location.trim() : undefined;
    const parsedStart = typeof body.startDate === "string" ? new Date(body.startDate) : undefined;
    const parsedEnd = typeof body.endDate === "string" ? new Date(body.endDate) : undefined;

    if (nextTitle !== undefined && !nextTitle) {
      return badRequest("Titulo obligatorio");
    }

    if (nextTitle !== undefined && nextTitle.length > EVENT_TITLE_MAX_LENGTH) {
      return badRequest("El titulo no puede superar 100 caracteres");
    }

    if (parsedStart && Number.isNaN(parsedStart.getTime())) {
      return badRequest("Fecha de inicio invalida");
    }

    if (parsedEnd && Number.isNaN(parsedEnd.getTime())) {
      return badRequest("Fecha de fin invalida");
    }

    const finalStart = parsedStart ?? existing.startDate;
    const finalEnd = parsedEnd ?? existing.endDate;

    if (finalEnd < finalStart) {
      return badRequest("La fecha de fin no puede ser menor a la de inicio");
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(nextTitle !== undefined ? { title: nextTitle } : {}),
        ...(nextDescription !== undefined ? { description: nextDescription || null } : {}),
        ...(nextLocation !== undefined ? { location: nextLocation || null } : {}),
        ...(parsedStart ? { startDate: parsedStart } : {}),
        ...(parsedEnd ? { endDate: parsedEnd } : {}),
        ...(body.isAllDay !== undefined ? { isAllDay: body.isAllDay === true } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        isAllDay: true,
        projectId: true,
        calendarId: true,
        project: { select: { name: true, color: true } },
        calendar: { select: { name: true, color: true } },
      },
    });

    return json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      location: updated.location,
      start: updated.startDate,
      end: updated.endDate,
      allDay: updated.isAllDay,
      sourceType: "event",
      projectId: updated.projectId,
      projectName: updated.project?.name ?? null,
      calendarId: updated.calendarId,
      calendarName: updated.calendar?.name ?? null,
      color: updated.calendar?.color ?? updated.project?.color ?? null,
      isReadOnly: false,
      canReschedule: true,
    });
  } catch (error) {
    console.error("UPDATE_CALENDAR_EVENT_ERROR", error);
    return serverError("No se pudo actualizar el evento");
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return invalidSessionResponse();
    }

    const { id } = await params;
    const existing = await prisma.event.findUnique({
      where: { id },
      select: { projectId: true, calendarId: true },
    });

    if (!existing) {
      return badRequest("Evento no encontrado");
    }

    const canEdit =
      (existing.projectId ? await canEditProjectContent(existing.projectId, actorUserId) : false) ||
      (existing.calendarId ? await canEditCalendarContent(existing.calendarId, actorUserId) : false);

    if (!canEdit) {
      return forbidden();
    }

    await prisma.event.delete({ where: { id } });
    return json({ message: "Evento eliminado" });
  } catch (error) {
    console.error("DELETE_CALENDAR_EVENT_ERROR", error);
    return serverError("No se pudo eliminar el evento");
  }
}
