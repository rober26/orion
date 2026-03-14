import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const folders = await prisma.notebookFolder.findMany({
      include: {
        notebooks: true,
      },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(folders);
  } catch (error) {
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
  } catch (error) {
    return NextResponse.json({ error: "Error al crear carpeta" }, { status: 500 });
  }
}