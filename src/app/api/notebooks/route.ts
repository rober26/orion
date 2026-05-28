import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/src/lib/http";
import { folderEditorWhere, notebookAccessWhere } from "@/src/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const baseAccess = notebookAccessWhere(sessionUser.userId);

    const notebooks = await prisma.notebook.findMany({
      where: {
        AND: [
          {
            OR: [{ folderId: null }, { folder: { projectId: null } }],
          },
          {
            projects: {
              none: {},
            },
          },
        ],
        ...baseAccess,
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
          where: { projectId: null },
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

    return json(payload);
  } catch {
    return serverError("Error al obtener notebooks");
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      folderId?: unknown;
      color?: unknown;
      icon?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const folderId = typeof body.folderId === "string" ? body.folderId : "";
    const color = typeof body.color === "string" ? body.color.trim() : "";
    const icon = typeof body.icon === "string" ? body.icon.trim() : "";

    if (!title || typeof title !== "string") {
      return badRequest("Titulo requerido");
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
        return json({ error: "Acceso denegado a carpeta" }, 403);
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
        icon: icon || "Book",
      },
    });

    return json(notebook);
  } catch (error) {
    console.error("PRISMA ERROR:", error);
    return serverError("Error al crear notebook");
  }
}
