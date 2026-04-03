import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: sessionUser.userId },
          { creatorId: sessionUser.userId },
          { users: { some: { userId: sessionUser.userId } } },
        ],
      },
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
      return NextResponse.json({ error: "Acceso denegado o proyecto no encontrado" }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("❌ Error en detalle del proyecto:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
