import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { hashToken } from "@/src/lib/auth-token";

type AuthTokenRow = {
  id: string;
  userId: string;
};

type PrismaWithAuthToken = typeof prisma & {
  authToken: {
    findFirst(args: unknown): Promise<AuthTokenRow | null>;
    update(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown>;
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
        type: "ACCESS_SETUP",
        usedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!storedToken) {
      return NextResponse.json({ error: "Token inválido o ya utilizado" }, { status: 400 });
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

    await prismaWithAuthToken.authToken.updateMany({
      where: {
        userId: storedToken.userId,
        type: "ACCESS_SETUP",
        usedAt: null,
        id: { not: storedToken.id },
      },
      data: { usedAt: now },
    });

    return NextResponse.json({ message: "Contraseña definida correctamente" });
  } catch (error) {
    console.error("COMPLETE_ACCESS_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
