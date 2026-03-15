import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

// Obtener todos los proyectos del usuario
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { documents: true, tasks: true }
        }
      }
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener proyectos" }, { status: 500 });
  }
}

// Crear un nuevo proyecto
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, color, creatorId } = body;

    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        color: color || "#3b82f6",
        creatorId,
        ownerId: creatorId, // Por ahora el creador es el dueño
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error("ERROR CREAR PROYECTO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}