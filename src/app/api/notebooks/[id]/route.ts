import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params; 

    const notebook = await prisma.notebook.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            icon: true,
            updatedAt: true,
          },
        },
        folder: true,
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(notebook);
  } catch (error: any) {
    console.error("Error al obtener el cuaderno:", error.message);
    return NextResponse.json(
      { error: "Error al obtener el notebook" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, color, icon, folderId, isPublic } = body;

    const updatedNotebook = await prisma.notebook.update({
      where: { id },
      data: {
        title,
        description,
        color,
        icon,
        folderId: folderId || null,
        isPublic,
      },
    });

    return NextResponse.json(updatedNotebook);
  } catch (error: any) {
    console.error("Error al actualizar el cuaderno:", error.message);
    return NextResponse.json(
      { error: "Error al actualizar el notebook" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.notebook.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Notebook eliminado correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar el cuaderno:", error.message);
    return NextResponse.json(
      { error: "Error al eliminar el notebook" },
      { status: 500 }
    );
  }
}