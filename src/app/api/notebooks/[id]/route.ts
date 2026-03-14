import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

// Obtener un notebook específico con sus documentos
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notebook = await prisma.notebook.findUnique({
      where: { id: params.id },
      include: {
        documents: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            icon: true,
            updatedAt: true
          }
        },
        folder: true
      }
    });

    if (!notebook) {
      return NextResponse.json({ error: "Notebook no encontrado" }, { status: 404 });
    }

    return NextResponse.json(notebook);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener el notebook" }, { status: 500 });
  }
}

// Actualizar metadatos del Notebook (Título, color, icono, etc.)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, description, color, icon, folderId, isPublic } = body;

    const updatedNotebook = await prisma.notebook.update({
      where: { id: params.id },
      data: {
        title,
        description, // TipTap puede enviar esto como JSON o HTML después
        color,
        icon,
        folderId: folderId || null,
        isPublic
      },
    });

    return NextResponse.json(updatedNotebook);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar el notebook" }, { status: 500 });
  }
}

// Eliminar el Notebook y sus relaciones
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Al eliminar el notebook, los documentos vinculados 
    // quedarán huérfanos o se borrarán según tu config de Prisma.
    await prisma.notebook.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Notebook eliminado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el notebook" }, { status: 500 });
  }
}