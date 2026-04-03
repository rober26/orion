// src/app/api/notebooks/documents/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

async function findAccessibleDocument(id: string, userId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      OR: [
        { creatorId: userId },
        { notebook: { ownerId: userId } },
        { notebook: { creatorId: userId } },
        { notebook: { users: { some: { userId } } } },
        { project: { ownerId: userId } },
        { project: { creatorId: userId } },
        { project: { users: { some: { userId } } } },
      ],
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

    return NextResponse.json(document);
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
    const existing = await findAccessibleDocument(id, sessionUser.userId);

    if (!existing) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, notebookId, position } = body;

    if (notebookId) {
      const canUseNotebook = await prisma.notebook.findFirst({
        where: {
          id: notebookId,
          OR: [
            { ownerId: sessionUser.userId },
            { creatorId: sessionUser.userId },
            { users: { some: { userId: sessionUser.userId } } },
          ],
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
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error: unknown) {
    console.error("Error al actualizar:", error);
    return NextResponse.json({ error: "Error al guardar los cambios" }, { status: 500 });
  }
}
