import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { folderEditorWhere, notebookAccessWhere } from "@/src/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const notebooks = await prisma.notebook.findMany({
      where: {
        ...notebookAccessWhere(sessionUser.userId),
      },
      include: {
        users: {
          where: { userId: sessionUser.userId },
          select: { role: true },
          take: 1,
        },
        _count: { select: { documents: true } },
        folder: true,
        documents: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            position: true,
            notebookId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const payload = notebooks.map((notebook) => {
      const membership = notebook.users[0] ?? null;
      const isOwnerLike = notebook.ownerId === sessionUser.userId || notebook.creatorId === sessionUser.userId;

      return {
        ...notebook,
        currentUserRole: isOwnerLike ? "OWNER" : membership?.role ?? null,
        isSharedWithMe: !isOwnerLike && Boolean(membership),
      };
    });

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Error al obtener notebooks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, folderId, color, icon } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Titulo requerido" }, { status: 400 });
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
        return NextResponse.json({ error: "Acceso denegado a carpeta" }, { status: 403 });
      }
    }

    const notebook = await prisma.notebook.create({
      data: {
        title,
        description,
        folderId: folderId || null,
        ownerId: sessionUser.userId,
        creatorId: sessionUser.userId,
        color: color || "#3b82f6",
        icon: icon || "Book"
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error("PRISMA ERROR:", error);
    return NextResponse.json({ error: "Error al crear notebook" }, { status: 500 });
  }
}
