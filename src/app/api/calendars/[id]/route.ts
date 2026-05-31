import { CalendarVisibility } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { canEditCalendarContent, canViewCalendar } from "@/src/lib/calendar-access";
import { parseProjectCalendarName, toCalendarDisplayName } from "@/src/lib/project-calendar";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

const CALENDAR_NAME_MAX_LENGTH = 100;

function parseVisibility(value: unknown): CalendarVisibility | null {
  if (value === CalendarVisibility.PUBLIC || value === CalendarVisibility.PRIVATE) {
    return value;
  }

  return null;
}

function parseHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const { id } = await params;
    if (!(await canViewCalendar(id, actorUserId))) {
      return forbidden();
    }

    const calendar = await prisma.calendar.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        visibility: true,
        isDefault: true,
        ownerId: true,
        creatorId: true,
      },
    });

    if (!calendar) {
      return badRequest("Calendario no encontrado");
    }

    const linkedProject = parseProjectCalendarName(calendar.name);

    const canEdit = await canEditCalendarContent(id, actorUserId);

    return json({
      ...calendar,
      name: toCalendarDisplayName(calendar.name),
      projectId: linkedProject?.projectId ?? null,
      canEdit,
    });
  } catch (error) {
    console.error("GET_CALENDAR_DETAIL_ERROR", error);
    return serverError("No se pudo cargar el calendario");
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
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const { id } = await params;
    if (!(await canEditCalendarContent(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as {
      name?: unknown;
      color?: unknown;
      visibility?: unknown;
    };

    const nextName = typeof body.name === "string" ? body.name.trim() : undefined;
    const nextColor = typeof body.color === "string" ? body.color.trim() : undefined;
    const nextVisibility = parseVisibility(body.visibility);

    if (nextName !== undefined && !nextName) {
      return badRequest("Nombre obligatorio");
    }

    const existing = await prisma.calendar.findUnique({ where: { id }, select: { name: true } });
    if (!existing) {
      return badRequest("Calendario no encontrado");
    }

    if (parseProjectCalendarName(existing.name)) {
      return badRequest("Los calendarios de proyecto no se editan manualmente");
    }

    if (nextName !== undefined && parseProjectCalendarName(nextName)) {
      return badRequest("Ese nombre esta reservado para calendarios de proyecto");
    }

    if (nextName !== undefined && nextName.length > CALENDAR_NAME_MAX_LENGTH) {
      return badRequest("El nombre no puede superar 100 caracteres");
    }

    if (nextColor !== undefined && nextColor && !parseHexColor(nextColor)) {
      return badRequest("Color invalido");
    }

    if (body.visibility !== undefined && !nextVisibility) {
      return badRequest("Visibilidad invalida");
    }

    const updated = await prisma.calendar.update({
      where: { id },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextColor !== undefined ? { color: nextColor || null } : {}),
        ...(nextVisibility ? { visibility: nextVisibility } : {}),
      },
      select: {
        id: true,
        name: true,
        color: true,
        visibility: true,
        isDefault: true,
      },
    });

    return json(updated);
  } catch (error) {
    console.error("UPDATE_CALENDAR_ERROR", error);
    return serverError("No se pudo actualizar el calendario");
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
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const { id } = await params;
    const calendar = await prisma.calendar.findUnique({ where: { id }, select: { ownerId: true, isDefault: true } });
    if (!calendar) {
      return badRequest("Calendario no encontrado");
    }

    if (calendar.ownerId !== actorUserId) {
      return forbidden("Solo el propietario puede eliminar el calendario");
    }

    if (calendar.isDefault) {
      return badRequest("No puedes eliminar el calendario por defecto");
    }

    await prisma.calendar.delete({ where: { id } });
    return json({ message: "Calendario eliminado" });
  } catch (error) {
    console.error("DELETE_CALENDAR_ERROR", error);
    return serverError("No se pudo eliminar el calendario");
  }
}
