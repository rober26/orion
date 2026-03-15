import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { updatedAt: 'desc' }, 
      select: {
        id: true,
        title: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener notas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, creatorId, notebookId, projectId } = body;

    if (!title || !creatorId) {
      return NextResponse.json(
        { error: "Título y ID del creador son obligatorios" },
        { status: 400 }
      );
    }

  
    const newDocument = await prisma.document.create({
      data: {
        title: title,
        creatorId: creatorId,
        notebookId: notebookId || null, 
        projectId: projectId || null,   
        content: {}, 
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear el documento:", error);
    
    if (error.code === 'P2023') {
      return NextResponse.json(
        { error: "Formato de ID (UUID) inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}