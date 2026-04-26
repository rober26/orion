import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { documentAccessWhere, notebookAccessWhere, notebookEditorWhere, projectAccessWhere } from "@/src/lib/permissions";

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const standaloneOnly = searchParams.get("standalone") === "true";
    const notebookId = searchParams.get("notebookId");
    const projectId = searchParams.get("projectId");

    if (notebookId) {
      const canAccessNotebook = await prisma.notebook.findFirst({
        where: {
          id: notebookId,
          ...notebookAccessWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!canAccessNotebook) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
    }

    if (projectId) {
      const canAccessProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          ...projectAccessWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!canAccessProject) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
    }

    const baseAccess = documentAccessWhere(sessionUser.userId);

    const where = projectId
      ? {
          projectId,
          OR: [{ creatorId: sessionUser.userId }, { project: projectAccessWhere(sessionUser.userId) }],
        }
      : {
          projectId: null,
          ...(standaloneOnly ? { notebookId: null } : {}),
          ...(notebookId ? { notebookId } : {}),
          OR: [
            baseAccess,
            {
              isPublic: true,
              OR: [
                { creatorId: sessionUser.userId },
                {
                  notebook: {
                    OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
                  },
                },
              ],
            },
          ],
        };

    const documents = await prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        notebookId: true,
        position: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        users: {
          where: { userId: sessionUser.userId },
          select: { role: true },
          take: 1,
        },
      }
    });

    const payload = documents.map((document) => {
      const membership = document.users[0] ?? null;
      const isOwnerLike = document.creatorId === sessionUser.userId;

      return {
        id: document.id,
        title: document.title,
        updatedAt: document.updatedAt,
        notebookId: document.notebookId,
        position: document.position,
        creator: document.creator,
        currentUserRole: isOwnerLike ? "OWNER" : membership?.role ?? null,
        isSharedWithMe: !isOwnerLike && Boolean(membership),
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET_DOCUMENTS_ERROR", error);
    return NextResponse.json({ error: "Error al obtener notas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { title, notebookId, projectId } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Titulo obligatorio" },
        { status: 400 }
      );
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

    if (projectId) {
      const canUseProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          ...projectAccessWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!canUseProject) {
        return NextResponse.json({ error: "Acceso denegado al proyecto" }, { status: 403 });
      }
    }

    const newDocument = await prisma.document.create({
      data: {
        title,
        creatorId: sessionUser.userId,
        notebookId: notebookId || null, 
        projectId: projectId || null,   
        content: {}, 
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error: unknown) {
    console.error("Error al crear el documento:", error);

    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (errorCode === "P2023") {
      return NextResponse.json(
        { error: "Formato de ID (UUID) inválido" },
        { status: 400 }
      );
    }

    const details = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: "Error interno del servidor", details },
      { status: 500 }
    );
  }
}
