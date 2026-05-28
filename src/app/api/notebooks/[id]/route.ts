import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { folderEditorWhere, notebookAccessWhere, notebookEditorWhere } from "@/src/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

async function canEditNotebook(notebookId: string, userId: string) {
  const notebook = await prisma.notebook.findFirst({
    where: {
      id: notebookId,
      ...notebookEditorWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(notebook);
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    const notebook = await prisma.notebook.findFirst({
      where: {
        id,
        ...notebookAccessWhere(sessionUser.userId),
      },
      include: {
        users: {
          where: { userId: sessionUser.userId },
          select: { role: true },
          take: 1,
        },
        documents: {
          where: { projectId: null },
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            icon: true,
            updatedAt: true,
            creatorId: true,
            users: {
              where: { userId: sessionUser.userId },
              select: { role: true },
              take: 1,
            },
          },
        },
        folder: true,
      },
    });

    if (!notebook) {
      return json({ error: "Notebook no encontrado" }, 404);
    }

    const notebookMembership = notebook.users[0] ?? null;
    const isNotebookOwnerLike = notebook.ownerId === sessionUser.userId || notebook.creatorId === sessionUser.userId;

    return json({
      ...notebook,
      currentUserRole: isNotebookOwnerLike ? "OWNER" : notebookMembership?.role ?? null,
      isSharedWithMe: !isNotebookOwnerLike && Boolean(notebookMembership),
      documents: notebook.documents.map((document) => {
        const membership = document.users[0] ?? null;
        const isOwnerLike = document.creatorId === sessionUser.userId;

        return {
          id: document.id,
          title: document.title,
          icon: document.icon,
          updatedAt: document.updatedAt,
          currentUserRole: isOwnerLike ? "OWNER" : membership?.role ?? null,
          isSharedWithMe: !isOwnerLike && Boolean(membership),
        };
      }),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al obtener el cuaderno:", message);
    return serverError("Error al obtener el notebook");
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    if (!(await canEditNotebook(id, sessionUser.userId))) {
      return forbidden();
    }

    const body = await req.json();
    const { title, description, color, icon, folderId, isPublic } = body;

    if (isPublic !== undefined && typeof isPublic !== "boolean") {
      return badRequest("Visibilidad invalida");
    }

    if (folderId) {
      const folder = await prisma.notebookFolder.findFirst({
        where: {
          id: folderId,
          ...folderEditorWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!folder) {
        return forbidden("Acceso denegado a carpeta");
      }
    }

    const updatedNotebook = await prisma.$transaction(async (tx) => {
      const updated = await tx.notebook.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(icon !== undefined ? { icon } : {}),
          ...(folderId !== undefined ? { folderId: folderId || null } : {}),
          ...(isPublic !== undefined ? { isPublic } : {}),
        },
      });

      if (typeof isPublic === "boolean") {
        await tx.document.updateMany({
          where: { notebookId: id },
          data: { isPublic },
        });
      }

      return updated;
    });

    return json(updatedNotebook);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al actualizar el cuaderno:", message);
    return serverError("Error al actualizar el notebook");
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    if (!(await canEditNotebook(id, sessionUser.userId))) {
      return forbidden();
    }

    await prisma.notebook.delete({
      where: { id },
    });

    return json({ message: "Notebook eliminado correctamente" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al eliminar el cuaderno:", message);
    return serverError("Error al eliminar el notebook");
  }
}
