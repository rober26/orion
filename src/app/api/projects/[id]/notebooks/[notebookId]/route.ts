import { getSessionUser } from "@/src/lib/auth";
import { forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type RouteParams = { params: Promise<{ id: string; notebookId: string }> };

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

    const { id, notebookId } = await params;

    if (!(await canEditProjectContent(id, actorUserId))) {
      return forbidden();
    }

    const existing = await prisma.notebookRelation.findUnique({
      where: {
        notebookId_projectId: {
          notebookId,
          projectId: id,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return json({ error: "Relacion no encontrada" }, 404);
    }

    await prisma.notebookRelation.delete({
      where: {
        notebookId_projectId: {
          notebookId,
          projectId: id,
        },
      },
    });

    return json({ message: "Cuaderno desvinculado" });
  } catch (error) {
    console.error("UNLINK_PROJECT_NOTEBOOK_ERROR", error);
    return serverError();
  }
}
