import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const notebookId = searchParams.get("notebookId");

  try {
    const documents = await prisma.document.findMany({
      where: notebookId ? { notebookId } : {},
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener documentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, notebookId, creatorId, projectId } = await req.json();

    const document = await prisma.document.create({
      data: {
        title,
        notebookId: notebookId || null,
        creatorId,
        projectId: projectId || null,
        content: {}, // Objeto JSON inicial para el editor
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: "Error al crear documento" }, { status: 500 });
  }
}