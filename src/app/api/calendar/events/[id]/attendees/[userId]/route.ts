import { ResponseStatus } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

function parseResponseStatus(value: unknown): ResponseStatus | null {
  if (value === ResponseStatus.PENDING || value === ResponseStatus.ACCEPTED || value === ResponseStatus.REJECTED) {
    return value;
  }

  return null;
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

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!event) {
      return badRequest("Evento no encontrado");
    }

    const canManage = await canEditProjectContent(event.projectId, actorUserId);
    const isSelf = userId === actorUserId;
    if (!canManage && !isSelf) {
      return forbidden();
    }

    if (!canManage && !(await canViewProject(event.projectId, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as { responseStatus?: unknown };
    const responseStatus = parseResponseStatus(body.responseStatus);
    if (!responseStatus) {
      return badRequest("responseStatus invalido");
    }

    const updated = await prisma.eventUser.update({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
      data: { responseStatus },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return json({
      user: updated.user,
      responseStatus: updated.responseStatus,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return badRequest("Asistente no encontrado");
      }
    }

    console.error("UPDATE_EVENT_ATTENDEE_ERROR", error);
    return serverError("No se pudo actualizar el asistente");
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

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!event) {
      return badRequest("Evento no encontrado");
    }

    const canManage = await canEditProjectContent(event.projectId, actorUserId);
    const isSelf = userId === actorUserId;
    if (!canManage && !isSelf) {
      return forbidden();
    }

    await prisma.eventUser.delete({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });

    return json({ message: "Asistente removido" });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return badRequest("Asistente no encontrado");
      }
    }

    console.error("DELETE_EVENT_ATTENDEE_ERROR", error);
    return serverError("No se pudo remover el asistente");
  }
}
