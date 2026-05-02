import { AccessRole } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

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

    const { id, userId } = await params;
    if (!(await canManageCalendarMembers(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as { role?: unknown };
    const role = parseAccessRole(body.role);
    if (!role) {
      return badRequest("role invalido");
    }

    const calendar = await prisma.calendar.findUnique({ where: { id }, select: { ownerId: true } });
    if (!calendar) {
      return badRequest("Calendario no encontrado");
    }

    if (userId === calendar.ownerId) {
      return badRequest("No puedes cambiar el rol del propietario");
    }

    const existing = await prisma.calendarUser.findFirst({
      where: { calendarId: id, userId },
      select: { id: true },
    });

    if (!existing) {
      return badRequest("Miembro no encontrado");
    }

    const updated = await prisma.calendarUser.update({
      where: { id: existing.id },
      data: { role },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return json({
      user: updated.user,
      role: updated.role,
      joinedAt: updated.joinedAt,
      inherited: false,
    });
  } catch (error) {
    console.error("UPDATE_CALENDAR_MEMBER_ERROR", error);
    return serverError("No se pudo actualizar el miembro");
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

    const { id, userId } = await params;
    if (!(await canManageCalendarMembers(id, actorUserId))) {
      return forbidden();
    }

    const calendar = await prisma.calendar.findUnique({ where: { id }, select: { ownerId: true } });
    if (!calendar) {
      return badRequest("Calendario no encontrado");
    }

    if (userId === calendar.ownerId) {
      return badRequest("No puedes revocar al propietario");
    }

    const existing = await prisma.calendarUser.findFirst({
      where: { calendarId: id, userId },
      select: { id: true },
    });

    if (!existing) {
      return badRequest("Miembro no encontrado");
    }

    await prisma.calendarUser.delete({ where: { id: existing.id } });
    return json({ message: "Acceso revocado" });
  } catch (error) {
    console.error("REMOVE_CALENDAR_MEMBER_ERROR", error);
    return serverError("No se pudo revocar el acceso");
  }
}
