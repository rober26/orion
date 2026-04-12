import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string }> };

async function ensureDefaultBoard(projectId: string, creatorId: string) {
  const existing = await prisma.kanbanBoard.findFirst({
    where: { projectId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.kanbanBoard.create({
    data: {
      projectId,
      creatorId,
      name: "Tareas",
      description: "Tablero principal del proyecto",
      position: 0,
      columns: {
        create: [
          { name: "Por asignar", color: "#64748b", position: 0 },
          { name: "Por hacer", color: "#0ea5e9", position: 1 },
          { name: "En progreso", color: "#f59e0b", position: 2 },
          { name: "Completado", color: "#10b981", position: 3 },
        ],
      },
    },
  });
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

    await ensureDefaultBoard(id, actorUserId);

    const boards = await prisma.kanbanBoard.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
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

    return json(boards);
  } catch (error) {
    console.error("GET_KANBAN_BOARDS_ERROR", error);
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

    const body = (await req.json()) as { name?: unknown; description?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!name) {
      return badRequest("Nombre obligatorio");
    }

    const boardCount = await prisma.kanbanBoard.count({ where: { projectId: id } });

    const board = await prisma.kanbanBoard.create({
      data: {
        name,
        description: description || null,
        projectId: id,
        creatorId: actorUserId,
        position: boardCount,
        columns: {
          create: [
            { name: "Por asignar", color: "#64748b", position: 0 },
            { name: "Por hacer", color: "#0ea5e9", position: 1 },
            { name: "En progreso", color: "#f59e0b", position: 2 },
            { name: "Completado", color: "#10b981", position: 3 },
          ],
        },
      },
    });

    return json(board, 201);
  } catch (error) {
    console.error("CREATE_KANBAN_BOARD_ERROR", error);
    return serverError();
  }
}
