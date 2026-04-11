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

    const folder = await prisma.notebookFolder.findFirst({
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
      select: {
        project: {
          select: {
            id: true,
            name: true,
            owner: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
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
        },
      },
    });

    if (!folder?.project) {
      return NextResponse.json({ members: [] });
    }

    const project = folder.project;

    const ownerMember = {
      user: project.owner,
      role: "OWNER",
      joinedAt: null,
      invitedBy: null,
      inherited: false,
      sourceResource: null,
    };

    const creatorMember = project.creator.id === project.owner.id
      ? null
      : {
          user: project.creator,
          role: "OWNER",
          joinedAt: null,
          invitedBy: null,
          inherited: false,
          sourceResource: null,
        };

    const members = project.users
      .filter((member) => member.userId !== project.owner.id && member.userId !== project.creator.id)
      .map((member) => ({
        user: member.user,
        role: member.role === "VIEWER" ? "READER" : member.role === "MEMBER" ? "EDITOR" : "OWNER",
        joinedAt: member.joinedAt,
        invitedBy: null,
        inherited: false,
        sourceResource: null,
      }));

    return NextResponse.json({ members: [ownerMember, ...(creatorMember ? [creatorMember] : []), ...members] });
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
          projectId: true,
          project: {
            select: {
              ownerId: true,
              creatorId: true,
            },
          },
        },
      }),
    ]);

    if (!targetUser || !targetUser.isActive || !folder) {
      return NextResponse.json({ error: "Destino invalido" }, { status: 404 });
    }

    if (!folder.projectId || !folder.project) {
      return NextResponse.json({ error: "No se puede compartir una carpeta sin proyecto asociado" }, { status: 400 });
    }

    const project = folder.project;

    if (targetUserId === project.ownerId || targetUserId === project.creatorId) {
      return NextResponse.json({ error: "El propietario del proyecto ya tiene acceso total" }, { status: 409 });
    }

    if (!connected) {
      return NextResponse.json({ error: "Solo puedes compartir con conexiones aceptadas" }, { status: 403 });
    }

    const projectRole = role === "READER" ? "VIEWER" : "MEMBER";

    const existing = await prisma.projectUser.findFirst({
      where: {
        projectId: folder.projectId,
        userId: targetUserId,
      },
      select: { id: true },
    });

    const membership = existing
      ? await prisma.projectUser.update({
          where: { id: existing.id },
          data: { role: projectRole },
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        })
      : await prisma.projectUser.create({
          data: {
            projectId: folder.projectId,
            userId: targetUserId,
            role: projectRole,
          },
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        });

    return NextResponse.json({
      user: membership.user,
      role: membership.role === "VIEWER" ? "READER" : membership.role === "MEMBER" ? "EDITOR" : "OWNER",
      joinedAt: membership.joinedAt,
      invitedBy: null,
      inherited: false,
      sourceResource: null,
    });
  } catch (error) {
    console.error("ADD_FOLDER_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
