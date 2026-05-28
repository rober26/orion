import type { Prisma } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { documentAccessWhere, documentEditorWhere, notebookEditorWhere } from "@/src/lib/permissions";

async function findAccessibleDocument(id: string, userId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      ...documentAccessWhere(userId),
    },
  });
}

async function findEditableDocument(id: string, userId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      ...documentEditorWhere(userId),
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    if (!id || id === "undefined") {
      return badRequest("ID no proporcionado");
    }

    const document = await findAccessibleDocument(id, sessionUser.userId);

    if (!document) {
      return forbidden("Acceso denegado o documento no encontrado");
    }

    const directMembership = await prisma.documentUser.findFirst({
      where: {
        documentId: id,
        userId: sessionUser.userId,
      },
      select: { role: true },
    });

    const editableDocument = await findEditableDocument(id, sessionUser.userId);
    const canEdit = Boolean(editableDocument);

    return json({
      ...document,
      currentUserRole:
        document.creatorId === sessionUser.userId ? "OWNER" : canEdit ? directMembership?.role ?? "EDITOR" : "READER",
      isSharedWithMe: document.creatorId !== sessionUser.userId && Boolean(directMembership),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error en GET [id]:", message);
    return serverError("Error interno");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;
    const existing = await findEditableDocument(id, sessionUser.userId);

    if (!existing) {
      return forbidden();
    }

    const body = (await req.json()) as {
      title?: unknown;
      content?: unknown;
      notebookId?: unknown;
      position?: unknown;
      isPublic?: unknown;
    };
    const title = typeof body.title === "string" ? body.title : undefined;
    const content = body.content;
    const notebookId = typeof body.notebookId === "string" ? body.notebookId : body.notebookId === null ? null : undefined;
    const position = typeof body.position === "number" ? body.position : undefined;
    const isPublic = typeof body.isPublic === "boolean" ? body.isPublic : undefined;

    if (body.isPublic !== undefined && isPublic === undefined) {
      return badRequest("Visibilidad invalida");
    }

    if (notebookId) {
      const canUseNotebook = await prisma.notebook.findFirst({
        where: {
          id: notebookId,
          ...notebookEditorWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!canUseNotebook) {
        return forbidden("Acceso denegado al cuaderno");
      }
    }

    const updateData: Prisma.DocumentUncheckedUpdateInput = {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content: content as Prisma.InputJsonValue }),
      ...(notebookId !== undefined && { notebookId }),
      ...(position !== undefined && { position }),
      ...(isPublic !== undefined && { isPublic }),
    };

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return json(updatedDocument);
  } catch (error: unknown) {
    console.error("Error al actualizar:", error);
    return serverError("Error al guardar los cambios");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;
    const existing = await findEditableDocument(id, sessionUser.userId);

    if (!existing) {
      return forbidden();
    }

    await prisma.document.delete({
      where: { id },
    });

    return json({ message: "Documento eliminado correctamente" });
  } catch (error: unknown) {
    console.error("Error al eliminar documento:", error);
    return serverError("Error al eliminar documento");
  }
}
