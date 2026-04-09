import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import {
  canManageNotebookMembers,
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

    const notebook = await prisma.notebook.findFirst({
      where: {
        id,
        OR: [
          { ownerId: sessionUser.userId },
          { creatorId: sessionUser.userId },
          { users: { some: { userId: sessionUser.userId } } },
        ],
      },
      select: {
        id: true,
        folder: {
          select: {
            id: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
                owner: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
                creator: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
                users: {
                  select: {
                    role: true,
                    user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
        owner: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
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

    if (!notebook) {
      return NextResponse.json({ error: "Notebook no encontrado" }, { status: 404 });
    }

    const ownerMember = {
      user: notebook.owner,
      role: "OWNER",
      joinedAt: null,
      invitedBy: null,
      inherited: false,
    };

    const members = notebook.users
      .filter((member) => member.userId !== notebook.owner.id)
      .map((member) => ({
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt,
        invitedBy: member.invitedBy,
        inherited: false,
        sourceResource: null,
      }));

    const inheritedMembersMap = new Map<string, {
      user: { id: string; username: string; firstName: string | null; lastName: string | null; avatarUrl: string | null };
      role: "OWNER" | "EDITOR" | "READER";
      joinedAt: null;
      invitedBy: null;
      inherited: true;
      sourceResource: { type: "project"; id: string; name: string };
    }>();

    if (notebook.folder?.project) {
      const project = notebook.folder.project;
      inheritedMembersMap.set(project.owner.id, {
        user: project.owner,
        role: "OWNER",
        joinedAt: null,
        invitedBy: null,
        inherited: true,
        sourceResource: { type: "project", id: project.id, name: project.name },
      });

      inheritedMembersMap.set(project.creator.id, {
        user: project.creator,
        role: "OWNER",
        joinedAt: null,
        invitedBy: null,
        inherited: true,
        sourceResource: { type: "project", id: project.id, name: project.name },
      });

      for (const member of project.users) {
        inheritedMembersMap.set(member.user.id, {
          user: member.user,
          role: member.role === "VIEWER" ? "READER" : member.role === "MEMBER" ? "EDITOR" : "OWNER",
          joinedAt: null,
          invitedBy: null,
          inherited: true,
          sourceResource: { type: "project", id: project.id, name: project.name },
        });
      }
    }

    inheritedMembersMap.delete(notebook.owner.id);
    for (const member of members) {
      inheritedMembersMap.delete(member.user.id);
    }

    const inheritedMembers = [...inheritedMembersMap.values()];

    return NextResponse.json({ members: [ownerMember, ...members, ...inheritedMembers] });
  } catch (error) {
    console.error("GET_NOTEBOOK_MEMBERS_ERROR", error);
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
    const canManage = await canManageNotebookMembers(id, sessionUser.userId);
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

    const [targetUser, connected, notebook] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } }),
      hasAcceptedConnection(sessionUser.userId, targetUserId),
      prisma.notebook.findUnique({ where: { id }, select: { ownerId: true } }),
    ]);

    if (!targetUser || !targetUser.isActive || !notebook) {
      return NextResponse.json({ error: "Destino invalido" }, { status: 404 });
    }

    if (targetUserId === notebook.ownerId) {
      return NextResponse.json({ error: "El propietario ya tiene acceso total" }, { status: 409 });
    }

    if (!connected) {
      return NextResponse.json({ error: "Solo puedes compartir con conexiones aceptadas" }, { status: 403 });
    }

    const existing = await prisma.notebookUser.findFirst({
      where: { notebookId: id, userId: targetUserId },
      select: { id: true },
    });

    const membership = existing
      ? await prisma.notebookUser.update({
          where: { id: existing.id },
          data: { role, invitedBy: sessionUser.userId },
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        })
      : await prisma.notebookUser.create({
          data: {
            notebookId: id,
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
    console.error("ADD_NOTEBOOK_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
