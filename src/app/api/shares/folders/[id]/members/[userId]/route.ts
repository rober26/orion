import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { canManageFolderMembers, parseAccessRole } from "@/src/lib/permissions";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, userId } = await params;
    const canManage = await canManageFolderMembers(id, sessionUser.userId);
    if (!canManage) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const role = parseAccessRole(body.role);

    if (!role) {
      return NextResponse.json({ error: "role invalido" }, { status: 400 });
    }

    const folder = await prisma.notebookFolder.findUnique({
      where: { id },
      select: {
        projectId: true,
        project: {
          select: {
            ownerId: true,
            creatorId: true,
          },
        },
      },
    });

    if (!folder || !folder.projectId || !folder.project) {
      return NextResponse.json({ error: "No se puede compartir una carpeta sin proyecto asociado" }, { status: 400 });
    }

    if (userId === folder.project.ownerId || userId === folder.project.creatorId) {
      return NextResponse.json({ error: "No puedes cambiar el rol del propietario" }, { status: 409 });
    }

    const projectRole = role === "READER" ? "VIEWER" : "MEMBER";

    const existing = await prisma.projectUser.findFirst({
      where: { projectId: folder.projectId, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    const updated = await prisma.projectUser.update({
      where: { id: existing.id },
      data: { role: projectRole },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      user: updated.user,
      role: updated.role === "VIEWER" ? "READER" : updated.role === "MEMBER" ? "EDITOR" : "OWNER",
      joinedAt: updated.joinedAt,
      invitedBy: null,
      inherited: false,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
      }
    }

    console.error("UPDATE_FOLDER_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, userId } = await params;
    const canManage = await canManageFolderMembers(id, sessionUser.userId);
    if (!canManage) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const folder = await prisma.notebookFolder.findUnique({
      where: { id },
      select: {
        projectId: true,
        project: {
          select: {
            ownerId: true,
            creatorId: true,
          },
        },
      },
    });

    if (!folder || !folder.projectId || !folder.project) {
      return NextResponse.json({ error: "No se puede compartir una carpeta sin proyecto asociado" }, { status: 400 });
    }

    if (userId === folder.project.ownerId || userId === folder.project.creatorId) {
      return NextResponse.json({ error: "No puedes revocar al propietario" }, { status: 409 });
    }

    const existing = await prisma.projectUser.findFirst({
      where: { projectId: folder.projectId, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    await prisma.projectUser.delete({ where: { id: existing.id } });

    return NextResponse.json({ message: "Acceso revocado" });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
      }
    }

    console.error("REMOVE_FOLDER_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
