import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const role = body.role;
    const isActive = body.isActive;

    if (role !== undefined && role !== UserRole.ADMIN && role !== UserRole.USER) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive inválido" }, { status: 400 });
    }

    if (sessionUser.userId === id && isActive === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propio usuario administrador" },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role === undefined ? undefined : (role as UserRole),
        isActive: isActive === undefined ? undefined : isActive,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    if (getPrismaErrorCode(error) === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    console.error("ADMIN_UPDATE_USER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
