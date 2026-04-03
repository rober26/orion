import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Debes completar ambos campos" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "La contraseña actual no coincide" }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ message: "Contraseña actualizada con éxito" });
  } catch (error) {
    console.error("CHANGE_PASSWORD_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
