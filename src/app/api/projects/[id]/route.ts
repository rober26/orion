import { ProjectRole } from "@prisma/client";
import { getSessionUser, type SessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { projectAccessWhere } from "@/src/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

const PROJECT_NAME_MAX_LENGTH = 100;

function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

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

async function canManageProject(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { creatorId: userId },
        { users: { some: { userId, role: { in: [ProjectRole.OWNER] } } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(project);
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

    const membersCount = getMembersCount(
      project.ownerId,
      project.creatorId,
      project.users.map((member) => member.userId),
    );

    return json({
      ...project,
      membersCount,
    });
  } catch (error) {
    console.error("Error al obtener proyecto:", error);
    return serverError("Error al obtener proyecto");
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

    if (!(await canManageProject(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      color?: unknown;
      isPublic?: unknown;
      isArchived?: unknown;
    };

    const data: {
      name?: string;
      description?: string;
      color?: string;
      isPublic?: boolean;
      isArchived?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return badRequest("Nombre invalido");
      }

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return badRequest("Nombre requerido");
      }
      if (normalizedName.length > PROJECT_NAME_MAX_LENGTH) {
        return badRequest("El nombre no puede superar 100 caracteres");
      }

      data.name = normalizedName;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return badRequest("Descripcion invalida");
      }

      const normalizedDescription = body.description.trim();
      data.description = normalizedDescription || "Nuevo proyecto";
    }

    if (body.color !== undefined) {
      if (typeof body.color !== "string") {
        return badRequest("Color invalido");
      }

      const normalizedColor = body.color.trim();
      if (!isValidHexColor(normalizedColor)) {
        return badRequest("Color invalido");
      }

      data.color = normalizedColor;
    }

    if (body.isPublic !== undefined) {
      if (typeof body.isPublic !== "boolean") {
        return badRequest("Visibilidad invalida");
      }

      data.isPublic = body.isPublic;
    }

    if (body.isArchived !== undefined) {
      if (typeof body.isArchived !== "boolean") {
        return badRequest("Estado invalido");
      }

      data.isArchived = body.isArchived;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No hay cambios para actualizar");
    }

    const project = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id },
        data,
        include: {
          _count: {
            select: { documents: true, tasks: true },
          },
          users: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (typeof data.isPublic === "boolean") {
        await tx.notebookFolder.updateMany({
          where: { projectId: id },
          data: { isPublic: data.isPublic },
        });

        await tx.notebook.updateMany({
          where: {
            OR: [
              {
                folder: {
                  projectId: id,
                },
              },
              {
                projects: {
                  some: {
                    projectId: id,
                  },
                },
              },
            ],
          },
          data: { isPublic: data.isPublic },
        });

        await tx.document.updateMany({
          where: {
            OR: [
              { projectId: id },
              {
                notebook: {
                  OR: [
                    {
                      folder: {
                        projectId: id,
                      },
                    },
                    {
                      projects: {
                        some: {
                          projectId: id,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
          data: { isPublic: data.isPublic },
        });
      }

      return updatedProject;
    });

    return json({
      ...project,
      membersCount: getMembersCount(
        project.ownerId,
        project.creatorId,
        project.users.map((member) => member.userId),
      ),
    });
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    return serverError("Error al actualizar proyecto");
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
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
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    if (!(await canManageProject(id, actorUserId))) {
      return forbidden();
    }

    if (permanent) {
      await prisma.project.delete({ where: { id } });
      return json({ message: "Proyecto eliminado correctamente" });
    }

    await prisma.project.update({ where: { id }, data: { isArchived: true } });
    return json({ message: "Proyecto archivado correctamente" });
  } catch (error) {
    console.error("Error al eliminar/archivar proyecto:", error);
    return serverError("Error al eliminar/archivar proyecto");
  }
}
