import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; columnId: string }> };

const DEFAULT_BOARD_NAME = "Tareas";
const DEFAULT_COLUMN_NAMES = ["Por asignar", "Por hacer", "En progreso", "Completado"];

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

    const { id, columnId } = await params;
    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const body = (await req.json()) as {
      name?: unknown;
      color?: unknown;
      position?: unknown;
      limitTask?: unknown;
    };

    const data: {
      name?: string;
      color?: string | null;
      position?: number;
      limitTask?: number | null;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return badRequest("Nombre invalido");
      }
      data.name = body.name.trim();
    }

    if (body.color !== undefined) {
      if (typeof body.color !== "string") {
        return badRequest("Color invalido");
      }
      data.color = body.color.trim() || null;
    }

    if (body.position !== undefined) {
      if (typeof body.position !== "number") {
        return badRequest("Posicion invalida");
      }
      data.position = body.position;
    }

    if (body.limitTask !== undefined) {
      if (body.limitTask !== null && typeof body.limitTask !== "number") {
        return badRequest("Limite invalido");
      }
      data.limitTask = body.limitTask;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No hay cambios para actualizar");
    }

    const existing = await prisma.kanbanColumn.findFirst({
      where: { id: columnId, board: { projectId: id } },
      select: { id: true, name: true, board: { select: { name: true } } },
    });

    if (!existing) {
      return json({ error: "Columna no encontrada" }, 404);
    }

    if (
      existing.board.name === DEFAULT_BOARD_NAME &&
      DEFAULT_COLUMN_NAMES.includes(existing.name) &&
      data.name &&
      data.name !== existing.name
    ) {
      return badRequest("Las columnas predeterminadas no se pueden renombrar");
    }

    const column = await prisma.kanbanColumn.update({
      where: { id: existing.id },
      data,
    });

    return json(column);
  } catch (error) {
    console.error("UPDATE_KANBAN_COLUMN_ERROR", error);
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

    const { id, columnId } = await params;
    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const existing = await prisma.kanbanColumn.findFirst({
      where: { id: columnId, board: { projectId: id } },
      select: { id: true, boardId: true, name: true, board: { select: { name: true } } },
    });

    if (!existing) {
      return json({ error: "Columna no encontrada" }, 404);
    }

    if (existing.board.name === DEFAULT_BOARD_NAME && DEFAULT_COLUMN_NAMES.includes(existing.name)) {
      return badRequest("Las columnas predeterminadas no se pueden eliminar");
    }

    const columnsCount = await prisma.kanbanColumn.count({ where: { boardId: existing.boardId } });
    if (columnsCount <= 1) {
      return badRequest("No puedes eliminar la unica columna del tablero");
    }

    await prisma.kanbanColumn.delete({ where: { id: existing.id } });

    return json({ message: "Columna eliminada" });
  } catch (error) {
    console.error("DELETE_KANBAN_COLUMN_ERROR", error);
    return serverError();
  }
}
