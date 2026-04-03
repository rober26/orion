import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

async function canAccessNotebook(notebookId: string, userId: string) {
  const notebook = await prisma.notebook.findFirst({
    where: {
      id: notebookId,
      OR: [
        { ownerId: userId },
        { creatorId: userId },
        { users: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return Boolean(notebook);
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params; 

    if (!(await canAccessNotebook(id, sessionUser.userId))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id,
        OR: [
          { ownerId: sessionUser.userId },
          { creatorId: sessionUser.userId },
          { users: { some: { userId: sessionUser.userId } } },
        ],
      },
      include: {
        documents: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            icon: true,
            updatedAt: true,
          },
        },
        folder: true,
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(notebook);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al obtener el cuaderno:", message);
    return NextResponse.json(
      { error: "Error al obtener el notebook" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (!(await canAccessNotebook(id, sessionUser.userId))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, color, icon, folderId, isPublic } = body;

    if (folderId) {
      const folder = await prisma.notebookFolder.findFirst({
        where: {
          id: folderId,
          OR: [
            {
              project: {
                OR: [
                  { ownerId: sessionUser.userId },
                  { creatorId: sessionUser.userId },
                  { users: { some: { userId: sessionUser.userId } } },
                ],
              },
            },
            {
              notebooks: {
                some: {
                  OR: [
                    { ownerId: sessionUser.userId },
                    { creatorId: sessionUser.userId },
                    { users: { some: { userId: sessionUser.userId } } },
                  ],
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (!folder) {
        return NextResponse.json({ error: "Acceso denegado a carpeta" }, { status: 403 });
      }
    }

    const updatedNotebook = await prisma.notebook.update({
      where: { id },
      data: {
        title,
        description,
        color,
        icon,
        folderId: folderId || null,
        isPublic,
      },
    });

    return NextResponse.json(updatedNotebook);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al actualizar el cuaderno:", message);
    return NextResponse.json(
      { error: "Error al actualizar el notebook" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (!(await canAccessNotebook(id, sessionUser.userId))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await prisma.notebook.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Notebook eliminado correctamente" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al eliminar el cuaderno:", message);
    return NextResponse.json(
      { error: "Error al eliminar el notebook" },
      { status: 500 }
    );
  }
}
