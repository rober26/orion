import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { canManageNotebookMembers, parseAccessRole } from "@/src/lib/permissions";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, userId } = await params;
    const canManage = await canManageNotebookMembers(id, sessionUser.userId);
    if (!canManage) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const role = parseAccessRole(body.role);

    if (!role) {
      return NextResponse.json({ error: "role invalido" }, { status: 400 });
    }

    const notebook = await prisma.notebook.findUnique({ where: { id }, select: { ownerId: true } });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook no encontrado" }, { status: 404 });
    }
    if (userId === notebook.ownerId) {
      return NextResponse.json({ error: "No puedes cambiar el rol del propietario" }, { status: 409 });
    }

    const existing = await prisma.notebookUser.findFirst({
      where: { notebookId: id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    const updated = await prisma.notebookUser.update({
      where: { id: existing.id },
      data: { role },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      user: updated.user,
      role: updated.role,
      joinedAt: updated.joinedAt,
      invitedBy: updated.invitedBy,
      inherited: false,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
      }
    }

    console.error("UPDATE_NOTEBOOK_MEMBER_ERROR", error);
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
    const canManage = await canManageNotebookMembers(id, sessionUser.userId);
    if (!canManage) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const notebook = await prisma.notebook.findUnique({ where: { id }, select: { ownerId: true } });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook no encontrado" }, { status: 404 });
    }
    if (userId === notebook.ownerId) {
      return NextResponse.json({ error: "No puedes revocar al propietario" }, { status: 409 });
    }

    const existing = await prisma.notebookUser.findFirst({
      where: { notebookId: id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    await prisma.notebookUser.delete({ where: { id: existing.id } });

    return NextResponse.json({ message: "Acceso revocado" });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
      }
    }

    console.error("REMOVE_NOTEBOOK_MEMBER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
