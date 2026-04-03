import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const standaloneOnly = searchParams.get("standalone") === "true";
    const notebookId = searchParams.get("notebookId");

    if (notebookId) {
      const canAccessNotebook = await prisma.notebook.findFirst({
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

      if (!canAccessNotebook) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
    }

    const documents = await prisma.document.findMany({
      where: {
        ...(standaloneOnly ? { notebookId: null } : {}),
        ...(notebookId ? { notebookId } : {}),
        OR: [
          { creatorId: sessionUser.userId },
          { notebook: { ownerId: sessionUser.userId } },
          { notebook: { creatorId: sessionUser.userId } },
          { notebook: { users: { some: { userId: sessionUser.userId } } } },
          { project: { ownerId: sessionUser.userId } },
          { project: { creatorId: sessionUser.userId } },
          { project: { users: { some: { userId: sessionUser.userId } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        notebookId: true,
        position: true,
      }
    });

    return NextResponse.json(documents);
  } catch {
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

    if (projectId) {
      const canUseProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: sessionUser.userId },
            { creatorId: sessionUser.userId },
            { users: { some: { userId: sessionUser.userId } } },
          ],
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
