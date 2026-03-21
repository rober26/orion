import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const folders = await prisma.notebookFolder.findMany({
      include: {
        notebooks: {
          orderBy: { updatedAt: "desc" },
          include: {
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
    const { name, parentId, projectId } = await req.json();
    
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
    const { id, name } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: "ID y nombre son obligatorios" }, { status: 400 });
    }

    const folder = await prisma.notebookFolder.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(folder);
  } catch {
    return NextResponse.json({ error: "Error al actualizar carpeta" }, { status: 500 });
  }
}
