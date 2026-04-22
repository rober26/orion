import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import {
  canManageFolderMembers,
  folderAccessWhere,
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
        ...folderAccessWhere(sessionUser.userId),
      },
      select: { id: true },
    });
    if (!canRead) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const folder = await prisma.notebookFolder.findFirst({
      where: {
        id,
        ...folderAccessWhere(sessionUser.userId),
      },
      select: {
        users: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ members: [] });
    }

    const members = folder.users.map((member) => ({
      user: member.user,
      role: member.role,
      joinedAt: member.joinedAt,
      invitedBy: member.invitedBy,
      inherited: false,
      sourceResource: null,
    }));

    return NextResponse.json({ members });
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

    const [targetUser, connected, folder] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(sessionUser.userId, targetUserId),
      prisma.notebookFolder.findUnique({
        where: { id },
        select: {
          id: true,
        },
      }),
    ]);

    if (!targetUser || !targetUser.isActive || !folder) {
      return NextResponse.json({ error: "Destino invalido" }, { status: 404 });
    }

    if (!connected) {
      return NextResponse.json({ error: "Solo puedes compartir con conexiones aceptadas" }, { status: 403 });
    }

    const membership = await prisma.notebookFolderUser.upsert({
      where: {
        folderId_userId: {
          folderId: folder.id,
          userId: targetUserId,
        },
      },
      create: {
        folderId: folder.id,
        userId: targetUserId,
        role,
        invitedBy: sessionUser.userId,
      },
      update: {
        role,
      },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      user: membership.user,
      role: membership.role,
      joinedAt: membership.joinedAt,
      invitedBy: membership.invitedBy,
      inherited: false,
      sourceResource: null,
    });
  } catch (error) {
    console.error("ADD_FOLDER_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
