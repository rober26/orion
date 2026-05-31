import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent } from "@/src/lib/permissions";
import { canEditCalendarContent } from "@/src/lib/calendar-access";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";
import { CALENDAR_ERROR_MESSAGE, invalidSessionResponse } from "@/src/lib/calendar/errors";

type RouteParams = { params: Promise<{ sourceType: string; id: string }> };

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

    const { sourceType, id } = await params;
    if (sourceType !== "event" && sourceType !== "task") {
      return badRequest("Tipo no soportado");
    }

    const body = (await req.json()) as {
      start?: unknown;
      end?: unknown;
      allDay?: unknown;
      dueDate?: unknown;
      projectId?: unknown;
      calendarId?: unknown;
    };

    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const calendarId = typeof body.calendarId === "string" ? body.calendarId : "";

    if (!projectId && !calendarId) {
      return badRequest(CALENDAR_ERROR_MESSAGE.missingOwnerReference);
    }

    const canEditByProject = projectId ? await canEditProjectContent(projectId, actorUserId) : false;
    const canEditByCalendar = calendarId ? await canEditCalendarContent(calendarId, actorUserId) : false;

    if (!(canEditByProject || canEditByCalendar)) {
      return forbidden();
    }

    if (sourceType === "event") {
      const start = typeof body.start === "string" ? new Date(body.start) : null;
      const end = typeof body.end === "string" ? new Date(body.end) : null;
      const allDay = body.allDay === true;

      if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
        return badRequest(CALENDAR_ERROR_MESSAGE.invalidDates);
      }

      if (end < start) {
        return badRequest(CALENDAR_ERROR_MESSAGE.endBeforeStart);
      }

      const existing = await prisma.event.findUnique({ where: { id }, select: { projectId: true, calendarId: true } });
      if (!existing || existing.projectId !== (projectId || null) || existing.calendarId !== (calendarId || null)) {
        return badRequest("Evento no encontrado");
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          startDate: start,
          endDate: end,
          isAllDay: allDay,
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
        isReadOnly: false,
        canReschedule: true,
      });
    }

    const dueDate = typeof body.dueDate === "string" ? new Date(body.dueDate) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return badRequest("Fecha invalida");
    }

    const existingTask = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
    if (!existingTask || existingTask.projectId !== projectId) {
      return badRequest("Tarea no encontrada");
    }

    const task = await prisma.task.update({
      where: { id },
      data: { dueDate },
      select: {
        id: true,
        title: true,
        dueDate: true,
        projectId: true,
        project: { select: { name: true, color: true } },
      },
    });

    return json({
      id: task.id,
      title: task.title,
      description: null,
      location: null,
      start: task.dueDate,
      end: task.dueDate,
      allDay: true,
      sourceType: "task",
      projectId: task.projectId,
      projectName: task.project.name,
      calendarId: null,
      calendarName: null,
      color: task.project.color,
      isReadOnly: false,
      canReschedule: true,
    });
  } catch (error) {
    console.error("MOVE_CALENDAR_ITEM_ERROR", error);
    return serverError("No se pudo mover el elemento");
  }
}
