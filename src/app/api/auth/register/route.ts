import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getAdminSettings } from "@/src/lib/admin-settings";
import { sendWelcomeEmail } from "@/src/lib/email";

export async function POST(request: Request) {
  try {
    const settings = await getAdminSettings();

    if (!settings.allowRegistration) {
      return NextResponse.json({ error: "El registro público está deshabilitado" }, { status: 403 });
    }

    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Email, username y contraseña son obligatorios" }, { status: 400 });
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "El username debe tener al menos 3 caracteres" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: UserRole.USER,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    try {
      await sendWelcomeEmail({ to: user.email, username: user.username });
    } catch (emailError) {
      console.error("WELCOME_EMAIL_ERROR", emailError);
    }

    return NextResponse.json({ message: "Registro exitoso", user }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (code === "P2002") {
        return NextResponse.json({ error: "Email o username ya están en uso" }, { status: 409 });
      }
    }

    console.error("REGISTER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
