import prisma from "@/src/lib/prisma";
import { getSessionUser, type SessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { projectAccessWhere } from "@/src/lib/permissions";

function getMembersCount(ownerId: string, creatorId: string, memberUserIds: string[]): number {
  return new Set([ownerId, creatorId, ...memberUserIds]).size;
}

async function resolveSessionUserId(sessionUser: SessionUser): Promise<string | null> {
  const userById = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: { id: true },
  });

  if (userById) {
    return userById.id;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: sessionUser.email },
    select: { id: true },
  });

  return userByEmail?.id ?? null;
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("ID no proporcionado");
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        ...projectAccessWhere(actorUserId),
      },
      include: {
        _count: {
          select: {
            documents: true,
            tasks: true,
          },
        },
        users: {
          select: {
            userId: true,
          },
        },
        tasks: {
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            updatedAt: true,
          },
        },
        documents: {
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      return forbidden("Acceso denegado o proyecto no encontrado");
    }

    return json({
      ...project,
      membersCount: getMembersCount(
        project.ownerId,
        project.creatorId,
        project.users.map((member) => member.userId),
      ),
    });
  } catch (error) {
    console.error("Error en detalle del proyecto:", error);
    return serverError("Error interno");
  }
}
