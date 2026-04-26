import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { folderAccessWhere, folderEditorWhere, notebookAccessWhere, projectEditorWhere } from "@/src/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const baseAccess = folderAccessWhere(sessionUser.userId);

    const folders = await prisma.notebookFolder.findMany({
      where: {
        projectId: null,
        OR: [
          baseAccess,
          {
            isPublic: true,
            notebooks: {
              some: {
                OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        isPublic: true,
        parentId: true,
        projectId: true,
        createdAt: true,
        notebooks: {
          where: {
            ...notebookAccessWhere(sessionUser.userId),
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            color: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            ownerId: true,
            creatorId: true,
            folderId: true,
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
                isPublic: true,
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

    let effectiveProjectId = typeof projectId === "string" && projectId.trim() ? projectId : null;

    if (effectiveProjectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: effectiveProjectId,
          ...projectEditorWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json({ error: "Acceso denegado al proyecto" }, { status: 403 });
      }
    } else {
      const personalProjectName = "Espacio personal notebooks";
      const personalProjectDescription = "Proyecto interno para carpetas del explorador";

      const personalProject = await prisma.project.findFirst({
        where: {
          ownerId: sessionUser.userId,
          creatorId: sessionUser.userId,
          name: personalProjectName,
        },
        select: { id: true },
      });

      if (personalProject) {
        effectiveProjectId = personalProject.id;
      } else {
        const createdProject = await prisma.project.create({
          data: {
            name: personalProjectName,
            description: personalProjectDescription,
            ownerId: sessionUser.userId,
            creatorId: sessionUser.userId,
            icon: "Folder",
            color: "#64748b",
            isPublic: false,
            isArchived: true,
          },
          select: { id: true },
        });

        effectiveProjectId = createdProject.id;
      }
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

    const { id, name, isPublic } = await req.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    }

    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "Nombre invalido" }, { status: 400 });
    }

    if (isPublic !== undefined && typeof isPublic !== "boolean") {
      return NextResponse.json({ error: "Visibilidad invalida" }, { status: 400 });
    }

    const normalizedName = typeof name === "string" ? name.trim() : undefined;

    if (normalizedName !== undefined && !normalizedName) {
      return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    }

    if (normalizedName === undefined && isPublic === undefined) {
      return NextResponse.json({ error: "No hay cambios para actualizar" }, { status: 400 });
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

    const folder = await prisma.$transaction(async (tx) => {
      const updatedFolder = await tx.notebookFolder.update({
        where: { id: canAccess.id },
        data: {
          ...(normalizedName !== undefined ? { name: normalizedName } : {}),
          ...(typeof isPublic === "boolean" ? { isPublic } : {}),
        },
      });

      if (typeof isPublic === "boolean") {
        await tx.notebook.updateMany({
          where: { folderId: canAccess.id },
          data: { isPublic },
        });

        await tx.document.updateMany({
          where: {
            notebook: {
              folderId: canAccess.id,
            },
          },
          data: { isPublic },
        });
      }

      return updatedFolder;
    });

    return NextResponse.json(folder);
  } catch {
    return NextResponse.json({ error: "Error al actualizar carpeta" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
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

    await prisma.$transaction([
      prisma.notebook.updateMany({
        where: { folderId: canAccess.id },
        data: { folderId: null },
      }),
      prisma.notebookFolder.delete({
        where: { id: canAccess.id },
      }),
    ]);

    return NextResponse.json({ message: "Carpeta eliminada correctamente" });
  } catch (error) {
    console.error("DELETE_FOLDER_ERROR", error);
    return NextResponse.json({ error: "Error al eliminar carpeta" }, { status: 500 });
  }
}
