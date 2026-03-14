import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { notebook: true }
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar el documento" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, content, icon, isPublic, position } = body;

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        title,
        content, // Prisma maneja el Json directamente
        icon,
        isPublic,
        position
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar documento" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.document.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: "Eliminado con éxito" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar documento" }, { status: 500 });
  }
}