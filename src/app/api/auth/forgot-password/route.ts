import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { generateRawToken, hashToken } from "@/src/lib/auth-token";
import { sendPasswordResetEmail } from "@/src/lib/email";

type PrismaWithAuthToken = typeof prisma & {
  authToken: {
    create(args: unknown): Promise<unknown>;
  };
};

const GENERIC_MESSAGE = "Si existe una cuenta con ese email, enviaremos instrucciones para recuperar tu contraseña";

export async function POST(request: Request) {
  try {
    const prismaWithAuthToken = prisma as PrismaWithAuthToken;
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prismaWithAuthToken.authToken.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET",
        tokenHash,
        expiresAt,
      },
    });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        username: user.username,
        token: rawToken,
      });
    } catch (emailError) {
      console.error("PASSWORD_RESET_EMAIL_ERROR", emailError);
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
