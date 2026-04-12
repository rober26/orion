import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canManageProjectMembers, normalizeProjectRole, parseProjectMemberRole } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

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

    if (!(await canManageProjectMembers(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as { role?: unknown };
    const role = parseProjectMemberRole(body.role);
    if (!role) {
      return badRequest("role invalido");
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true, creatorId: true },
    });

    if (!project) {
      return json({ error: "Proyecto no encontrado" }, 404);
    }

    if (userId === project.ownerId || userId === project.creatorId) {
      return json({ error: "No puedes cambiar el rol del propietario" }, 409);
    }

    const existing = await prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
      select: { id: true },
    });

    if (!existing) {
      return json({ error: "Miembro no encontrado" }, 404);
    }

    const updated = await prisma.projectUser.update({
      where: { id: existing.id },
      data: { role },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return json({
      user: updated.user,
      role: normalizeProjectRole(updated.role),
      joinedAt: updated.joinedAt,
      inherited: false,
    });
  } catch (error) {
    console.error("UPDATE_PROJECT_MEMBER_ERROR", error);
    return serverError();
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

    if (!(await canManageProjectMembers(id, actorUserId))) {
      return forbidden();
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true, creatorId: true },
    });

    if (!project) {
      return json({ error: "Proyecto no encontrado" }, 404);
    }

    if (userId === project.ownerId || userId === project.creatorId) {
      return json({ error: "No puedes revocar al propietario" }, 409);
    }

    const existing = await prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
      select: { id: true },
    });

    if (!existing) {
      return json({ error: "Miembro no encontrado" }, 404);
    }

    await prisma.projectUser.delete({ where: { id: existing.id } });

    return json({ message: "Acceso revocado" });
  } catch (error) {
    console.error("REMOVE_PROJECT_MEMBER_ERROR", error);
    return serverError();
  }
}
