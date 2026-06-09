import { AccessRole, CalendarVisibility, ProjectRole } from "@prisma/client";
import { getSessionUser, type SessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { canEditProjectContent, projectReadWhere } from "@/src/lib/permissions";
import { buildProjectCalendarName, buildProjectCalendarPrefix } from "@/src/lib/project-calendar";
import { getInvalidSessionMessage } from "@/src/lib/validation/auth";

type RouteParams = { params: Promise<{ id: string }> };

const PROJECT_NAME_MAX_LENGTH = 100;

function parseGroupIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function getMembersCount(ownerId: string, creatorId: string, memberUserIds: string[]): number {
  return new Set([ownerId, creatorId, ...memberUserIds]).size;
}

function isMissingCalendarSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  if (code !== "P2021" && code !== "P2022") {
    return false;
  }

  const meta = (error as { meta?: unknown }).meta;
  const metaText = typeof meta === "object" && meta !== null ? JSON.stringify(meta).toLowerCase() : "";
  return metaText.includes("calendar");
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
      return unauthorized(getInvalidSessionMessage());
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        ...projectReadWhere(actorUserId),
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
        group: {
          select: {
            id: true,
            name: true,
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

    const [canEdit, canManage] = await Promise.all([
      canEditProjectContent(id, actorUserId),
      canManageProject(id, actorUserId),
    ]);

    return json({
      ...project,
      membersCount,
      permissions: {
        canEdit,
        canManage,
      },
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
      return unauthorized(getInvalidSessionMessage());
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
      groupIds?: unknown;
      groupId?: unknown;
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

    const requestedGroupIds = (() => {
      if (body.groupIds !== undefined) {
        return parseGroupIds(body.groupIds);
      }

      if (body.groupId !== undefined) {
        if (body.groupId === null) {
          return [];
        }

        if (typeof body.groupId !== "string") {
          return null;
        }

        const value = body.groupId.trim();
        return value ? [value] : [];
      }

      return undefined;
    })();

    if (requestedGroupIds === null) {
      return badRequest("Equipo invalido");
    }

    if (Array.isArray(requestedGroupIds) && requestedGroupIds.length > 0) {
      const groups = await prisma.group.findMany({
        where: {
          id: { in: requestedGroupIds },
          OR: [{ ownerId: actorUserId }, { members: { some: { userId: actorUserId } } }],
        },
        select: { id: true },
      });

      if (groups.length !== requestedGroupIds.length) {
        return badRequest("No tienes acceso a alguno de los equipos seleccionados");
      }
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

      try {
        const prefix = buildProjectCalendarPrefix(updatedProject.id);
        const linkedCalendar = await tx.calendar.findFirst({
          where: {
            ownerId: updatedProject.ownerId,
            name: {
              startsWith: prefix,
            },
          },
          orderBy: [{ createdAt: "asc" }],
          select: { id: true },
        });

        if (linkedCalendar) {
          await tx.calendar.update({
            where: { id: linkedCalendar.id },
            data: {
              name: buildProjectCalendarName(updatedProject.id, updatedProject.name),
              color: updatedProject.color,
            },
          });
        } else {
          await tx.calendar.create({
            data: {
              name: buildProjectCalendarName(updatedProject.id, updatedProject.name),
              color: updatedProject.color,
              visibility: CalendarVisibility.PRIVATE,
              ownerId: updatedProject.ownerId,
              creatorId: actorUserId,
              users: {
                create: {
                  userId: updatedProject.ownerId,
                  role: AccessRole.OWNER,
                  invitedBy: actorUserId,
                },
              },
            },
          });
        }
      } catch (calendarError) {
        if (!isMissingCalendarSchemaError(calendarError)) {
          throw calendarError;
        }
      }

      if (Array.isArray(requestedGroupIds)) {
        await tx.project.update({
          where: { id },
          data: {
            groupId: requestedGroupIds[0] ?? null,
          },
        });
      }

      const group = await tx.project.findUnique({
        where: { id },
        select: {
          group: {
            select: {
              id: true,
              name: true,
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

      return {
        ...updatedProject,
        group: group?.group ?? null,
      };
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
      return unauthorized(getInvalidSessionMessage());
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    if (!(await canManageProject(id, actorUserId))) {
      return forbidden();
    }

    if (permanent) {
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.findUnique({
          where: { id },
          select: { id: true, ownerId: true },
        });

        await tx.notebookRelation.deleteMany({
          where: { projectId: id },
        });

        await tx.document.updateMany({
          where: { projectId: id },
          data: { projectId: null },
        });

        await tx.notebookFolder.updateMany({
          where: { projectId: id },
          data: { projectId: null },
        });

        await tx.workSession.updateMany({
          where: { projectId: id },
          data: { projectId: null },
        });

        await tx.file.deleteMany({
          where: { projectId: id },
        });

        await tx.tag.deleteMany({
          where: { projectId: id },
        });

        if (project) {
          try {
            await tx.calendar.deleteMany({
              where: {
                ownerId: project.ownerId,
                name: {
                  startsWith: buildProjectCalendarPrefix(project.id),
                },
              },
            });
          } catch (calendarError) {
            if (!isMissingCalendarSchemaError(calendarError)) {
              throw calendarError;
            }
          }
        }

        await tx.project.delete({ where: { id } });
      });

      return json({ message: "Proyecto eliminado correctamente" });
    }

    await prisma.project.update({ where: { id }, data: { isArchived: true } });
    return json({ message: "Proyecto archivado correctamente" });
  } catch (error) {
    console.error("Error al eliminar/archivar proyecto:", error);
    return serverError("Error al eliminar/archivar proyecto");
  }
}
