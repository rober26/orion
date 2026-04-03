import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Traemos tareas que tengan fecha de vencimiento
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { not: null },
        project: {
          OR: [
            { ownerId: sessionUser.userId },
            { creatorId: sessionUser.userId },
            { users: { some: { userId: sessionUser.userId } } },
          ],
        },
      },
      select: { id: true, title: true, dueDate: true, priority: true }
    });

    // Traemos proyectos (usando su fecha de creación o una fecha límite si la tienes)
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: sessionUser.userId },
          { creatorId: sessionUser.userId },
          { users: { some: { userId: sessionUser.userId } } },
        ],
      },
      select: { id: true, name: true, createdAt: true, color: true }
    });

    // Formateamos todo como "eventos"
    const events = [
      ...tasks.map(t => ({ id: t.id, title: t.title, date: t.dueDate, type: 'task' })),
      ...projects.map(p => ({ id: p.id, title: p.name, date: p.createdAt, type: 'project', color: p.color }))
    ];

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Error al cargar eventos" }, { status: 500 });
  }
}
