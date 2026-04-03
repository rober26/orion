import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(users);
  } catch (error) {
    console.error("ADMIN_LIST_USERS_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const role = body.role;
    const isActive = body.isActive;

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Email, username y contraseña son obligatorios" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "El username debe tener al menos 3 caracteres" }, { status: 400 });
    }

    if (role !== undefined && role !== UserRole.USER && role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive inválido" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role ?? UserRole.USER,
        isActive: isActive ?? true,
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

    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (code === "P2002") {
        return NextResponse.json({ error: "Email o username ya están en uso" }, { status: 409 });
      }
    }

    console.error("ADMIN_CREATE_USER_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
