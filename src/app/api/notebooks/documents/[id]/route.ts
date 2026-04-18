// src/app/api/notebooks/documents/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const document = await findAccessibleDocument(id, sessionUser.userId);

    if (!document) {
      return NextResponse.json({ error: "Acceso denegado o documento no encontrado" }, { status: 403 });
    }

    const directMembership = await prisma.documentUser.findFirst({
      where: {
        documentId: id,
        userId: sessionUser.userId,
      },
      select: { role: true },
    });

    const response = {
      ...document,
      currentUserRole: document.creatorId === sessionUser.userId ? "OWNER" : directMembership?.role ?? null,
      isSharedWithMe: document.creatorId !== sessionUser.userId && Boolean(directMembership),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error en GET [id]:", message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await findEditableDocument(id, sessionUser.userId);

    if (!existing) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, notebookId, position, isPublic } = body;

    if (isPublic !== undefined && typeof isPublic !== "boolean") {
      return NextResponse.json({ error: "Visibilidad invalida" }, { status: 400 });
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
        return NextResponse.json({ error: "Acceso denegado al cuaderno" }, { status: 403 });
      }
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(notebookId !== undefined && { notebookId }),
        ...(position !== undefined && { position }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error: unknown) {
    console.error("Error al actualizar:", error);
    return NextResponse.json({ error: "Error al guardar los cambios" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await findEditableDocument(id, sessionUser.userId);

    if (!existing) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Documento eliminado correctamente" });
  } catch (error: unknown) {
    console.error("Error al eliminar documento:", error);
    return NextResponse.json({ error: "Error al eliminar documento" }, { status: 500 });
  }
}
