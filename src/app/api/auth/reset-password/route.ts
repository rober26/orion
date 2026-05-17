import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { hashToken } from "@/src/lib/auth-token";

type AuthTokenResetRow = {
  id: string;
  userId: string;
  expiresAt: Date | null;
};

type PrismaWithAuthToken = typeof prisma & {
  authToken: {
    findFirst(args: unknown): Promise<AuthTokenResetRow | null>;
    update(args: unknown): Promise<unknown>;
  };
};

export async function POST(request: Request) {
  try {
    const prismaWithAuthToken = prisma as PrismaWithAuthToken;
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son obligatorios" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const storedToken = await prismaWithAuthToken.authToken.findFirst({
      where: {
        tokenHash,
        type: "PASSWORD_RESET",
        usedAt: null,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!storedToken) {
      return NextResponse.json({ error: "Token inválido o ya utilizado" }, { status: 400 });
    }

    if (!storedToken.expiresAt || storedToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "El token ha expirado" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    await prisma.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash },
    });

    await prismaWithAuthToken.authToken.update({
      where: { id: storedToken.id },
      data: { usedAt: now },
    });

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
