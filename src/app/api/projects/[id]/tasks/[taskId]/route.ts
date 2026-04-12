import { TaskPriority, TaskStatus } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; taskId: string }> };

function parseTaskStatus(value: unknown): TaskStatus | null {
  if (value === TaskStatus.TODO || value === TaskStatus.IN_PROGRESS || value === TaskStatus.DONE) {
    return value;
  }

  return null;
}

function parseTaskPriority(value: unknown): TaskPriority | null {
  if (value === TaskPriority.LOW || value === TaskPriority.MEDIUM || value === TaskPriority.HIGH) {
    return value;
  }

  return null;
}

async function findProjectTask(projectId: string, taskId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
    select: { id: true },
  });
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

    const { id, taskId } = await params;
    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const existing = await findProjectTask(id, taskId);
    if (!existing) {
      return json({ error: "Tarea no encontrada" }, 404);
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      status?: unknown;
      priority?: unknown;
      dueDate?: unknown;
      columnId?: unknown;
      position?: unknown;
      assigneeIds?: unknown;
    };

    const data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | null;
      columnId?: string | null;
      position?: number;
    } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return badRequest("Titulo invalido");
      }
      data.title = body.title.trim();
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return badRequest("Descripcion invalida");
      }
      data.description = body.description.trim() || null;
    }

    if (body.status !== undefined) {
      const parsed = parseTaskStatus(body.status);
      if (!parsed) {
        return badRequest("Estado invalido");
      }
      data.status = parsed;
    }

    if (body.priority !== undefined) {
      const parsed = parseTaskPriority(body.priority);
      if (!parsed) {
        return badRequest("Prioridad invalida");
      }
      data.priority = parsed;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        data.dueDate = null;
      } else if (typeof body.dueDate === "string") {
        const parsedDueDate = new Date(body.dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
          return badRequest("Fecha invalida");
        }
        data.dueDate = parsedDueDate;
      } else {
        return badRequest("Fecha invalida");
      }
    }

    if (body.columnId !== undefined) {
      if (body.columnId !== null && typeof body.columnId !== "string") {
        return badRequest("Columna invalida");
      }

      if (typeof body.columnId === "string") {
        const column = await prisma.kanbanColumn.findFirst({
          where: { id: body.columnId, board: { projectId: id } },
          select: { id: true },
        });

        if (!column) {
          return badRequest("La columna no pertenece al proyecto");
        }
      }

      data.columnId = body.columnId;
    }

    if (body.position !== undefined) {
      if (typeof body.position !== "number") {
        return badRequest("Posicion invalida");
      }

      data.position = body.position;
    }

    const assigneeIds = Array.isArray(body.assigneeIds)
      ? body.assigneeIds.filter((value): value is string => typeof value === "string")
      : null;

    const task = await prisma.$transaction(async (tx) => {
      if (assigneeIds) {
        await tx.taskUser.deleteMany({ where: { taskId } });
        if (assigneeIds.length > 0) {
          await tx.taskUser.createMany({
            data: assigneeIds.map((userId) => ({
              taskId,
              userId,
              assignedBy: actorUserId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.task.update({
        where: { id: taskId },
        data,
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    });

    return json(task);
  } catch (error) {
    console.error("UPDATE_PROJECT_TASK_ERROR", error);
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

    const { id, taskId } = await params;
    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const existing = await findProjectTask(id, taskId);
    if (!existing) {
      return json({ error: "Tarea no encontrada" }, 404);
    }

    await prisma.task.delete({ where: { id: taskId } });

    return json({ message: "Tarea eliminada" });
  } catch (error) {
    console.error("DELETE_PROJECT_TASK_ERROR", error);
    return serverError();
  }
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

    const { id, taskId } = await params;
    if (!(await canViewProject(id, actorUserId))) {
      return forbidden();
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: id,
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return json({ error: "Tarea no encontrada" }, 404);
    }

    return json(task);
  } catch (error) {
    console.error("GET_PROJECT_TASK_ERROR", error);
    return serverError();
  }
}
