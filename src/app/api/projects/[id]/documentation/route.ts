import { getSessionUser } from "@/src/lib/auth";
import { forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canViewProject } from "@/src/lib/permissions";
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

    const [projectFolders, projectDocuments, relatedNotebooks] = await Promise.all([
      prisma.notebookFolder.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "asc" },
        include: {
          notebooks: {
            select: {
              id: true,
              title: true,
              color: true,
              updatedAt: true,
              _count: { select: { documents: true } },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
      prisma.document.findMany({
        where: { projectId: id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          notebookId: true,
        },
      }),
      prisma.notebookRelation.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        include: {
          notebook: {
            select: {
              id: true,
              title: true,
              color: true,
              updatedAt: true,
              documents: {
                where: {
                  OR: [{ projectId: null }, { projectId: { not: id } }],
                },
                orderBy: { updatedAt: "desc" },
                select: {
                  id: true,
                  title: true,
                  updatedAt: true,
                  projectId: true,
                },
                take: 20,
              },
            },
          },
        },
      }),
    ]);

    return json({
      project: {
        folders: projectFolders,
        documents: projectDocuments,
      },
      related: {
        notebooks: relatedNotebooks.map((relation) => relation.notebook),
      },
    });
  } catch (error) {
    console.error("GET_PROJECT_DOCUMENTATION_ERROR", error);
    return serverError();
  }
}
