import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject } from "@/src/lib/permissions";
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

    const folders = await prisma.notebookFolder.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
      include: {
        notebooks: {
          select: {
            id: true,
            title: true,
            color: true,
            updatedAt: true,
            _count: {
              select: { documents: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    return json(folders);
  } catch (error) {
    console.error("GET_PROJECT_FOLDERS_ERROR", error);
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

    const body = (await req.json()) as { name?: unknown; parentId?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const parentId = typeof body.parentId === "string" ? body.parentId : null;

    if (!name) {
      return badRequest("Nombre obligatorio");
    }

    if (parentId) {
      const parent = await prisma.notebookFolder.findFirst({
        where: { id: parentId, projectId: id },
        select: { id: true },
      });

      if (!parent) {
        return badRequest("La carpeta padre no existe en el proyecto");
      }
    }

    const folder = await prisma.notebookFolder.create({
      data: {
        name,
        parentId,
        projectId: id,
      },
    });

    return json(folder, 201);
  } catch (error) {
    console.error("CREATE_PROJECT_FOLDER_ERROR", error);
    return serverError();
  }
}
