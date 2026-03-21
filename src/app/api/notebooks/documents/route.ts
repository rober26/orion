import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const standaloneOnly = searchParams.get("standalone") === "true";
    const notebookId = searchParams.get("notebookId");

    const documents = await prisma.document.findMany({
      where: {
        ...(standaloneOnly ? { notebookId: null } : {}),
        ...(notebookId ? { notebookId } : {}),
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
        title,
        creatorId,
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
