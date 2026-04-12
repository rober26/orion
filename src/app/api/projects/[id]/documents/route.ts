import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject, notebookEditorWhere } from "@/src/lib/permissions";
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

    const documents = await prisma.document.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        notebookId: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return json(documents);
  } catch (error) {
    console.error("GET_PROJECT_DOCUMENTS_ERROR", error);
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

    const body = (await req.json()) as { title?: unknown; notebookId?: unknown };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const notebookId = typeof body.notebookId === "string" ? body.notebookId : null;

    if (!title) {
      return badRequest("Titulo obligatorio");
    }

    if (notebookId) {
      const notebook = await prisma.notebook.findFirst({
        where: {
          id: notebookId,
          ...notebookEditorWhere(actorUserId),
        },
        select: { id: true },
      });

      if (!notebook) {
        return forbidden("No tienes acceso de edicion al cuaderno");
      }
    }

    const document = await prisma.document.create({
      data: {
        title,
        content: {},
        creatorId: actorUserId,
        projectId: id,
        notebookId,
      },
    });

    return json(document, 201);
  } catch (error) {
    console.error("CREATE_PROJECT_DOCUMENT_ERROR", error);
    return serverError();
  }
}
