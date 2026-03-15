// src/app/api/notebooks/documents/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("🔍 Buscando documento con ID:", id); 

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id }, 
    });

    if (!document) {
      console.log("Documento no encontrado en la DB");
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error: any) {
    console.error("Error en GET [id]:", error.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content } = body;

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error: any) {
    console.error("Error al actualizar:", error);
    return NextResponse.json({ error: "Error al guardar los cambios" }, { status: 500 });
  }
}