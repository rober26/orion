import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: true,
            tasks: true,
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("❌ Error en detalle del proyecto:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}