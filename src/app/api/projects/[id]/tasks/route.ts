import { TaskPriority, TaskStatus } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

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

    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      orderBy: [{ status: "asc" }, { position: "asc" }, { updatedAt: "desc" }],
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

    return json(tasks);
  } catch (error) {
    console.error("GET_PROJECT_TASKS_ERROR", error);
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
    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      status?: unknown;
      priority?: unknown;
      dueDate?: unknown;
      columnId?: unknown;
      assigneeIds?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const status = parseTaskStatus(body.status) ?? TaskStatus.TODO;
    const priority = parseTaskPriority(body.priority) ?? TaskPriority.MEDIUM;
    const columnId = typeof body.columnId === "string" ? body.columnId : null;
    const assigneeIds = Array.isArray(body.assigneeIds)
      ? body.assigneeIds.filter((value): value is string => typeof value === "string")
      : [];

    if (!title) {
      return badRequest("Titulo obligatorio");
    }

    let parsedDueDate: Date | null = null;
    if (body.dueDate !== undefined && body.dueDate !== null) {
      if (typeof body.dueDate !== "string") {
        return badRequest("Fecha invalida");
      }

      parsedDueDate = new Date(body.dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return badRequest("Fecha invalida");
      }
    }

    if (columnId) {
      const column = await prisma.kanbanColumn.findFirst({
        where: { id: columnId, board: { projectId: id } },
        select: { id: true },
      });

      if (!column) {
        return badRequest("La columna no pertenece al proyecto");
      }
    }

    const position = await prisma.task.count({
      where: {
        projectId: id,
        ...(columnId ? { columnId } : { status }),
      },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status,
        priority,
        dueDate: parsedDueDate,
        projectId: id,
        creatorId: actorUserId,
        columnId,
        position,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
            assignedBy: actorUserId,
          })),
        },
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

    return json(task, 201);
  } catch (error) {
    console.error("CREATE_PROJECT_TASK_ERROR", error);
    return serverError();
  }
}
