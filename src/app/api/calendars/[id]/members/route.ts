import { AccessRole } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { hasAcceptedConnection } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { canViewCalendar } from "@/src/lib/calendar-access";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

function parseAccessRole(value: unknown): AccessRole | null {
  if (value === AccessRole.READER || value === AccessRole.EDITOR) {
    return value;
  }

  return null;
}

async function canManageCalendarMembers(calendarId: string, actorUserId: string): Promise<boolean> {
  const calendar = await prisma.calendar.findFirst({
    where: {
      id: calendarId,
      OR: [{ ownerId: actorUserId }, { creatorId: actorUserId }, { users: { some: { userId: actorUserId, role: AccessRole.OWNER } } }],
    },
    select: { id: true },
  });

  return Boolean(calendar);
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
        owner: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
        users: {
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!calendar) {
      return badRequest("Calendario no encontrado");
    }

    const members = [
      {
        user: calendar.owner,
        role: AccessRole.OWNER,
        joinedAt: null,
        inherited: false,
      },
      ...calendar.users
        .filter((member) => member.userId !== calendar.owner.id)
        .map((member) => ({
          user: member.user,
          role: member.role,
          joinedAt: member.joinedAt,
          inherited: false,
        })),
    ];

    return json({ members });
  } catch (error) {
    console.error("GET_CALENDAR_MEMBERS_ERROR", error);
    return serverError("No se pudieron cargar los miembros");
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
    if (!(await canManageCalendarMembers(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as { userId?: unknown; role?: unknown };
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const role = parseAccessRole(body.role);

    if (!targetUserId || !role) {
      return badRequest("userId y role son obligatorios");
    }

    if (targetUserId === actorUserId) {
      return badRequest("No puedes invitarte a ti mismo");
    }

    const [targetUser, connected, calendar] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(actorUserId, targetUserId),
      prisma.calendar.findUnique({ where: { id }, select: { ownerId: true } }),
    ]);

    if (!targetUser || !targetUser.isActive || !calendar) {
      return badRequest("Destino invalido");
    }

    if (targetUserId === calendar.ownerId) {
      return badRequest("El propietario ya tiene acceso total");
    }

    if (!connected) {
      return forbidden("Solo puedes compartir con conexiones aceptadas");
    }

    const existing = await prisma.calendarUser.findFirst({
      where: { calendarId: id, userId: targetUserId },
      select: { id: true },
    });

    const membership = existing
      ? await prisma.calendarUser.update({
          where: { id: existing.id },
          data: { role, invitedBy: actorUserId },
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        })
      : await prisma.calendarUser.create({
          data: {
            calendarId: id,
            userId: targetUserId,
            role,
            invitedBy: actorUserId,
          },
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        });

    return json({
      user: membership.user,
      role: membership.role,
      joinedAt: membership.joinedAt,
      inherited: false,
    });
  } catch (error) {
    console.error("ADD_CALENDAR_MEMBER_ERROR", error);
    return serverError("No se pudo agregar el miembro");
  }
}
