import { AccessRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { folderAccessWhere, folderEditorWhere, notebookAccessWhere, projectEditorWhere } from "@/src/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const baseAccess = folderAccessWhere(sessionUser.userId);

    const folders = await prisma.notebookFolder.findMany({
      where: {
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
                projectId: null,
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

    return json(payload);
  } catch {
    return serverError("Error al obtener carpetas");
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { name, parentId, projectId } = await req.json();

    if (!name || typeof name !== "string") {
      return badRequest("Nombre obligatorio");
    }

    const effectiveProjectId = typeof projectId === "string" && projectId.trim() ? projectId : null;

    if (effectiveProjectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: effectiveProjectId,
          ...projectEditorWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!project) {
        return forbidden("Acceso denegado al proyecto");
      }
    }

    const folder = await prisma.$transaction(async (tx) => {
      const createdFolder = await tx.notebookFolder.create({
        data: {
          name,
          parentId: parentId || null,
          projectId: effectiveProjectId,
        },
      });

      await tx.notebookFolderUser.upsert({
        where: {
          folderId_userId: {
            folderId: createdFolder.id,
            userId: sessionUser.userId,
          },
        },
        update: {
          role: AccessRole.OWNER,
        },
        create: {
          folderId: createdFolder.id,
          userId: sessionUser.userId,
          role: AccessRole.OWNER,
        },
      });

      return createdFolder;
    });

    return json(folder);
  } catch (error) {
    console.error("CREATE_FOLDER_ERROR", error);
    return serverError("Error al crear carpeta");
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id, name, isPublic } = await req.json();

    if (!id || typeof id !== "string") {
      return badRequest("ID obligatorio");
    }

    if (name !== undefined && typeof name !== "string") {
      return badRequest("Nombre invalido");
    }

    if (isPublic !== undefined && typeof isPublic !== "boolean") {
      return badRequest("Visibilidad invalida");
    }

    const normalizedName = typeof name === "string" ? name.trim() : undefined;

    if (normalizedName !== undefined && !normalizedName) {
      return badRequest("Nombre obligatorio");
    }

    if (normalizedName === undefined && isPublic === undefined) {
      return badRequest("No hay cambios para actualizar");
    }

    const canAccess = await prisma.notebookFolder.findFirst({
      where: {
        id,
        ...folderEditorWhere(sessionUser.userId),
      },
      select: { id: true },
    });

    if (!canAccess) {
      return forbidden();
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

    return json(folder);
  } catch {
    return serverError("Error al actualizar carpeta");
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return badRequest("ID obligatorio");
    }

    const canAccess = await prisma.notebookFolder.findFirst({
      where: {
        id,
        ...folderEditorWhere(sessionUser.userId),
      },
      select: { id: true },
    });

    if (!canAccess) {
      return forbidden();
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

    return json({ message: "Carpeta eliminada correctamente" });
  } catch (error) {
    console.error("DELETE_FOLDER_ERROR", error);
    return serverError("Error al eliminar carpeta");
  }
}
