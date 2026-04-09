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

    return NextResponse.json({ error: "Compartir carpetas no disponible en este entorno" }, { status: 501 });
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

    return NextResponse.json({ error: "Compartir carpetas no disponible en este entorno" }, { status: 501 });
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
