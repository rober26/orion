import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/src/lib/prisma";
import { parseJson, serverError, unauthorized } from "@/src/lib/http";
import { setSessionCookie, signSessionToken } from "@/src/lib/session";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = await parseJson<LoginBody>(request);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return unauthorized("Credenciales invalidas");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return unauthorized("Credenciales invalidas");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return unauthorized("Credenciales invalidas");
    }

    const token = signSessionToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({
      message: "Login exitoso",
      user: { username: user.username, email: user.email },
    });

    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return serverError();
  }
}
