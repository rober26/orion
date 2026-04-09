import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { folderAccessWhere, folderEditorWhere, notebookAccessWhere, projectAccessWhere } from "@/src/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const folders = await prisma.notebookFolder.findMany({
      where: {
        ...folderAccessWhere(sessionUser.userId),
      },
      include: {
        notebooks: {
          where: {
            ...notebookAccessWhere(sessionUser.userId),
          },
          orderBy: { updatedAt: "desc" },
          include: {
            users: {
              where: { userId: sessionUser.userId },
              select: { role: true },
              take: 1,
            },
            documents: {
              where: {
                OR: [{ creatorId: sessionUser.userId }, { notebook: notebookAccessWhere(sessionUser.userId) }],
              },
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
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const payload = folders.map((folder) => ({
      ...folder,
      notebooks: folder.notebooks.map((notebook) => {
        const membership = notebook.users[0] ?? null;
        const isOwnerLike = notebook.ownerId === sessionUser.userId || notebook.creatorId === sessionUser.userId;

        return {
          ...notebook,
          currentUserRole: isOwnerLike ? "OWNER" : membership?.role ?? null,
          isSharedWithMe: !isOwnerLike && Boolean(membership),
        };
      }),
    }));

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Error al obtener carpetas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name, parentId, projectId } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    }

    let effectiveProjectId = projectId as string | null;

    if (effectiveProjectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: effectiveProjectId,
          ...projectAccessWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json({ error: "Acceso denegado al proyecto" }, { status: 403 });
      }
    } else {
      const fallbackProject = await prisma.project.findFirst({
        where: projectAccessWhere(sessionUser.userId),
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      if (!fallbackProject) {
        return NextResponse.json(
          { error: "Primero crea un proyecto para poder organizar carpetas" },
          { status: 409 },
        );
      }

      effectiveProjectId = fallbackProject.id;
    }

    const folder = await prisma.notebookFolder.create({
      data: {
        name,
        parentId: parentId || null,
        projectId: effectiveProjectId,
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("CREATE_FOLDER_ERROR", error);
    return NextResponse.json({ error: "Error al crear carpeta" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, name } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: "ID y nombre son obligatorios" }, { status: 400 });
    }

    const canAccess = await prisma.notebookFolder.findFirst({
      where: {
        id,
        ...folderEditorWhere(sessionUser.userId),
      },
      select: { id: true },
    });

    if (!canAccess) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const folder = await prisma.notebookFolder.update({
      where: { id: canAccess.id },
      data: { name },
    });

    return NextResponse.json(folder);
  } catch {
    return NextResponse.json({ error: "Error al actualizar carpeta" }, { status: 500 });
  }
}
