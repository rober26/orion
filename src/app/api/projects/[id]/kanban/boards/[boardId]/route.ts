import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; boardId: string }> };

const DEFAULT_BOARD_NAME = "Tareas";

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

    const { id, boardId } = await params;
    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      position?: unknown;
    };

    const data: { name?: string; description?: string | null; position?: number } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return badRequest("Nombre invalido");
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return badRequest("Descripcion invalida");
      }
      data.description = body.description.trim() || null;
    }

    if (body.position !== undefined) {
      if (typeof body.position !== "number") {
        return badRequest("Posicion invalida");
      }
      data.position = body.position;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No hay cambios para actualizar");
    }

    const existing = await prisma.kanbanBoard.findFirst({
      where: { id: boardId, projectId: id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return json({ error: "Tablero no encontrado" }, 404);
    }

    if (existing.name === DEFAULT_BOARD_NAME && data.name && data.name !== DEFAULT_BOARD_NAME) {
      return badRequest("El tablero principal no se puede renombrar");
    }

    const board = await prisma.kanbanBoard.update({
      where: { id: existing.id },
      data,
    });

    return json(board);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return json({ error: "Tablero no encontrado" }, 404);
      }
    }

    console.error("UPDATE_KANBAN_BOARD_ERROR", error);
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

    const { id, boardId } = await params;

    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const boardsCount = await prisma.kanbanBoard.count({ where: { projectId: id } });
    if (boardsCount <= 1) {
      return badRequest("No puedes eliminar el unico tablero del proyecto");
    }

    const existing = await prisma.kanbanBoard.findFirst({
      where: { id: boardId, projectId: id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return json({ error: "Tablero no encontrado" }, 404);
    }

    if (existing.name === DEFAULT_BOARD_NAME) {
      return badRequest("El tablero principal no se puede eliminar");
    }

    await prisma.kanbanBoard.delete({ where: { id: existing.id } });

    return json({ message: "Tablero eliminado" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return json({ error: "Tablero no encontrado" }, 404);
      }
    }

    console.error("DELETE_KANBAN_BOARD_ERROR", error);
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

    const { id, boardId } = await params;

    if (!(await canViewProject(id, actorUserId))) {
      return forbidden();
    }

    const board = await prisma.kanbanBoard.findFirst({
      where: { id: boardId, projectId: id },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tasks: {
              orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
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
            },
          },
        },
      },
    });

    if (!board) {
      return json({ error: "Tablero no encontrado" }, 404);
    }

    return json(board);
  } catch (error) {
    console.error("GET_KANBAN_BOARD_ERROR", error);
    return serverError();
  }
}
