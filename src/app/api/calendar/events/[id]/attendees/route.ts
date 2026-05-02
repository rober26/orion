import { ResponseStatus } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject, hasAcceptedConnection } from "@/src/lib/permissions";
import { canEditCalendarContent, canViewCalendar } from "@/src/lib/calendar-access";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

async function resolveEventAndAccess(eventId: string, actorUserId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      creatorId: true,
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
    return { event: null, canRead: false, canManage: false };
  }

  const canRead =
    event.users.length > 0 ||
    (event.projectId ? await canViewProject(event.projectId, actorUserId) : false) ||
    (event.calendarId ? await canViewCalendar(event.calendarId, actorUserId) : false);
  const canManage =
    (event.projectId ? await canEditProjectContent(event.projectId, actorUserId) : false) ||
    (event.calendarId ? await canEditCalendarContent(event.calendarId, actorUserId) : false);

  return { event, canRead, canManage };
}

function parseResponseStatus(value: unknown): ResponseStatus | null {
  if (value === ResponseStatus.PENDING || value === ResponseStatus.ACCEPTED || value === ResponseStatus.REJECTED) {
    return value;
  }

  return null;
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
    const { event, canRead } = await resolveEventAndAccess(id, actorUserId);

    if (!event) {
      return badRequest("Evento no encontrado");
    }

    if (!canRead) {
      return forbidden();
    }

    const attendees = await prisma.eventUser.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { user: { username: "asc" } },
    });

    return json({
      attendees: attendees.map((attendee) => ({
        user: attendee.user,
        responseStatus: attendee.responseStatus,
      })),
    });
  } catch (error) {
    console.error("GET_EVENT_ATTENDEES_ERROR", error);
    return serverError("No se pudieron cargar los asistentes");
  }
}

export async function POST(req: Request, { params }: RouteParams) {
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
    const { event, canManage } = await resolveEventAndAccess(id, actorUserId);
    if (!event) {
      return badRequest("Evento no encontrado");
    }

    if (!canManage) {
      return forbidden();
    }

    const body = (await req.json()) as { userId?: unknown; responseStatus?: unknown };
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const responseStatus = parseResponseStatus(body.responseStatus) ?? ResponseStatus.PENDING;

    if (!targetUserId) {
      return badRequest("userId obligatorio");
    }

    if (targetUserId === actorUserId) {
      return badRequest("No puedes invitarte a ti mismo");
    }

    const [targetUser, connected] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(actorUserId, targetUserId),
    ]);

    if (!targetUser || !targetUser.isActive) {
      return badRequest("Usuario invalido");
    }

    if (!connected) {
      return forbidden("Solo puedes compartir con conexiones aceptadas");
    }

    const existing = await prisma.eventUser.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: targetUserId,
        },
      },
      select: { eventId: true, userId: true },
    });

    const attendee = existing
      ? await prisma.eventUser.update({
          where: {
            eventId_userId: {
              eventId: event.id,
              userId: targetUserId,
            },
          },
          data: { responseStatus },
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        })
      : await prisma.eventUser.create({
          data: {
            eventId: event.id,
            userId: targetUserId,
            responseStatus,
          },
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        });

    return json({
      user: attendee.user,
      responseStatus: attendee.responseStatus,
    });
  } catch (error) {
    console.error("ADD_EVENT_ATTENDEE_ERROR", error);
    return serverError("No se pudo agregar el asistente");
  }
}
