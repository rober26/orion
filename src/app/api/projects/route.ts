import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

// Obtener todos los proyectos del usuario
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: sessionUser.userId },
          { creatorId: sessionUser.userId },
          { users: { some: { userId: sessionUser.userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { documents: true, tasks: true }
        }
      }
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Error al obtener proyectos" }, { status: 500 });
  }
}

// Crear un nuevo proyecto
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, color } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        color: color || "#3b82f6",
        creatorId: sessionUser.userId,
        ownerId: sessionUser.userId,
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: unknown) {
    console.error("ERROR CREAR PROYECTO:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
