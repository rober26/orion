import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import {
  canManageDocumentMembers,
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

    const document = await prisma.document.findFirst({
      where: {
        id,
        OR: [
          { creatorId: sessionUser.userId },
          { users: { some: { userId: sessionUser.userId } } },
          { notebook: { users: { some: { userId: sessionUser.userId } } } },
          { notebook: { ownerId: sessionUser.userId } },
          { notebook: { creatorId: sessionUser.userId } },
        ],
      },
      select: {
        id: true,
        creator: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
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

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    const ownerMember = {
      user: document.creator,
      role: "OWNER",
      joinedAt: null,
      invitedBy: null,
      inherited: false,
      sourceResource: null,
    };

    const members = document.users
      .filter((member) => member.userId !== document.creator.id)
      .map((member) => ({
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt,
        invitedBy: member.invitedBy,
        inherited: false,
        sourceResource: null,
      }));

    return NextResponse.json({ members: [ownerMember, ...members] });
  } catch (error) {
    console.error("GET_DOCUMENT_MEMBERS_ERROR", error);
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
    const canManage = await canManageDocumentMembers(id, sessionUser.userId);
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

    const [targetUser, connected, document] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(sessionUser.userId, targetUserId),
      prisma.document.findUnique({ where: { id }, select: { creatorId: true } }),
    ]);

    if (!targetUser || !targetUser.isActive || !document) {
      return NextResponse.json({ error: "Destino invalido" }, { status: 404 });
    }

    if (targetUserId === document.creatorId) {
      return NextResponse.json({ error: "El creador ya tiene acceso total" }, { status: 409 });
    }

    if (!connected) {
      return NextResponse.json({ error: "Solo puedes compartir con conexiones aceptadas" }, { status: 403 });
    }

    const existing = await prisma.documentUser.findFirst({
      where: { documentId: id, userId: targetUserId },
      select: { id: true },
    });

    const membership = existing
      ? await prisma.documentUser.update({
          where: { id: existing.id },
          data: { role, invitedBy: sessionUser.userId },
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        })
      : await prisma.documentUser.create({
          data: {
            documentId: id,
            userId: targetUserId,
            role,
            invitedBy: sessionUser.userId,
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
    });
  } catch (error) {
    console.error("ADD_DOCUMENT_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
