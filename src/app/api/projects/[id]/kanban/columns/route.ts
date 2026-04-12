import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

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

    const body = (await req.json()) as { boardId?: unknown; name?: unknown; color?: unknown };
    const boardId = typeof body.boardId === "string" ? body.boardId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const color = typeof body.color === "string" ? body.color.trim() : null;

    if (!boardId || !name) {
      return badRequest("boardId y name son obligatorios");
    }

    const board = await prisma.kanbanBoard.findFirst({
      where: { id: boardId, projectId: id },
      select: { id: true },
    });

    if (!board) {
      return badRequest("Tablero no encontrado");
    }

    const position = await prisma.kanbanColumn.count({ where: { boardId } });

    const column = await prisma.kanbanColumn.create({
      data: {
        boardId,
        name,
        color,
        position,
      },
    });

    return json(column, 201);
  } catch (error) {
    console.error("CREATE_KANBAN_COLUMN_ERROR", error);
    return serverError();
  }
}
