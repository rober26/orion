import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const folders = await prisma.notebookFolder.findMany({
      where: {
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
      include: {
        notebooks: {
          where: {
            OR: [
              { ownerId: sessionUser.userId },
              { creatorId: sessionUser.userId },
              { users: { some: { userId: sessionUser.userId } } },
            ],
          },
          orderBy: { updatedAt: "desc" },
          include: {
            documents: {
              where: {
                OR: [
                  { creatorId: sessionUser.userId },
                  { notebook: { ownerId: sessionUser.userId } },
                  { notebook: { creatorId: sessionUser.userId } },
                  { notebook: { users: { some: { userId: sessionUser.userId } } } },
                ],
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
    return NextResponse.json(folders);
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

    if (!projectId) {
      return NextResponse.json({ error: "projectId es obligatorio" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
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

    if (!project) {
      return NextResponse.json({ error: "Acceso denegado al proyecto" }, { status: 403 });
    }
    
    const folder = await prisma.notebookFolder.create({
      data: {
        name,
        parentId: parentId || null,
        projectId: projectId || null,
      },
    });

    return NextResponse.json(folder);
  } catch {
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
