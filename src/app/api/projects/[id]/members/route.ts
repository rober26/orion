import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import {
  canManageProjectMembers,
  canViewProject,
  hasAcceptedConnection,
  normalizeProjectRole,
  parseProjectMemberRole,
} from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

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

    if (!(await canViewProject(id, actorUserId))) {
      return forbidden();
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        owner: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
        creator: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
        users: {
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!project) {
      return forbidden();
    }

    const members = [
      {
        user: project.owner,
        role: "OWNER",
        joinedAt: null,
        inherited: false,
      },
      ...(project.creator.id !== project.owner.id
        ? [
            {
              user: project.creator,
              role: "OWNER",
              joinedAt: null,
              inherited: false,
            },
          ]
        : []),
      ...project.users
        .filter((member) => member.userId !== project.owner.id && member.userId !== project.creator.id)
        .map((member) => ({
          user: member.user,
          role: normalizeProjectRole(member.role),
          joinedAt: member.joinedAt,
          inherited: false,
        })),
    ];

    return json({ members });
  } catch (error) {
    console.error("GET_PROJECT_MEMBERS_ERROR", error);
    return serverError();
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
    if (!(await canManageProjectMembers(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as { userId?: unknown; role?: unknown };
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const role = parseProjectMemberRole(body.role);

    if (!targetUserId || !role) {
      return badRequest("userId y role son obligatorios");
    }

    if (targetUserId === actorUserId) {
      return badRequest("No puedes invitarte a ti mismo");
    }

    const [project, targetUser, connected] = await Promise.all([
      prisma.project.findUnique({ where: { id }, select: { ownerId: true, creatorId: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(actorUserId, targetUserId),
    ]);

    if (!project || !targetUser || !targetUser.isActive) {
      return json({ error: "Destino invalido" }, 404);
    }

    if (targetUserId === project.ownerId || targetUserId === project.creatorId) {
      return json({ error: "El propietario ya tiene acceso total" }, 409);
    }

    if (!connected) {
      return forbidden("Solo puedes compartir con conexiones aceptadas");
    }

    const membership = await prisma.projectUser.upsert({
      where: { projectId_userId: { projectId: id, userId: targetUserId } },
      update: { role },
      create: { projectId: id, userId: targetUserId, role },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return json({
      user: membership.user,
      role: normalizeProjectRole(membership.role),
      joinedAt: membership.joinedAt,
      inherited: false,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return json({ error: "El usuario ya pertenece al proyecto" }, 409);
      }
    }

    console.error("ADD_PROJECT_MEMBER_ERROR", error);
    return serverError();
  }
}
