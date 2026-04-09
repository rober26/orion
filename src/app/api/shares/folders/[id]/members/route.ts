import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import {
  canManageFolderMembers,
  hasAcceptedConnection,
  parseAccessRole,
} from "@/src/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const canRead = await prisma.notebookFolder.findFirst({
      where: {
        id,
        OR: [
          {
            project: {
              OR: [
                { ownerId: sessionUser.userId },
                { creatorId: sessionUser.userId },
                { users: { some: { userId: sessionUser.userId } } },
              ],
            },
          },
          {
            notebooks: {
              some: {
                OR: [
                  { ownerId: sessionUser.userId },
                  { creatorId: sessionUser.userId },
                  { users: { some: { userId: sessionUser.userId } } },
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!canRead) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ members: [] });
  } catch (error) {
    console.error("GET_FOLDER_MEMBERS_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const canManage = await canManageFolderMembers(id, sessionUser.userId);
    if (!canManage) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const role = parseAccessRole(body.role);

    if (!targetUserId || !role) {
      return NextResponse.json({ error: "userId y role son obligatorios" }, { status: 400 });
    }

    if (targetUserId === sessionUser.userId) {
      return NextResponse.json({ error: "No puedes invitarte a ti mismo" }, { status: 400 });
    }

    const [targetUser, connected] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(sessionUser.userId, targetUserId),
    ]);

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: "Destino invalido" }, { status: 404 });
    }

    if (!connected) {
      return NextResponse.json({ error: "Solo puedes compartir con conexiones aceptadas" }, { status: 403 });
    }

    return NextResponse.json({ error: "Compartir carpetas no disponible en este entorno" }, { status: 501 });
  } catch (error) {
    console.error("ADD_FOLDER_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
