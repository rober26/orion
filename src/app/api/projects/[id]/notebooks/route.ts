import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, canViewProject, notebookAccessWhere } from "@/src/lib/permissions";
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

    const relations = await prisma.notebookRelation.findMany({
      where: { projectId: id },
      include: {
        notebook: {
          select: {
            id: true,
            title: true,
            color: true,
            folderId: true,
            updatedAt: true,
            _count: {
              select: { documents: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return json(relations.map((relation) => relation.notebook));
  } catch (error) {
    console.error("GET_PROJECT_NOTEBOOKS_ERROR", error);
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

    const body = (await req.json()) as { notebookId?: unknown };
    const notebookId = typeof body.notebookId === "string" ? body.notebookId : "";

    if (!notebookId) {
      return badRequest("notebookId obligatorio");
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        ...notebookAccessWhere(actorUserId),
      },
      select: { id: true },
    });

    if (!notebook) {
      return forbidden("No tienes acceso al cuaderno");
    }

    const relation = await prisma.notebookRelation.create({
      data: {
        projectId: id,
        notebookId,
      },
      include: {
        notebook: {
          select: {
            id: true,
            title: true,
            color: true,
            folderId: true,
            updatedAt: true,
            _count: {
              select: { documents: true },
            },
          },
        },
      },
    });

    return json(relation.notebook, 201);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return json({ error: "El cuaderno ya esta vinculado al proyecto" }, 409);
      }
    }

    console.error("LINK_PROJECT_NOTEBOOK_ERROR", error);
    return serverError();
  }
}
