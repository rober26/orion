import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";

type PrismaWithAccessRequest = typeof prisma & {
  accessRequest: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
};

export async function POST(request: Request) {
  try {
    const prismaWithAccessRequest = prisma as PrismaWithAccessRequest;
    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

    if (!email || !username || !firstName || !lastName) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "El username debe tener al menos 3 caracteres" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe una cuenta con esos datos" }, { status: 409 });
    }

    const pending = await prismaWithAccessRequest.accessRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (pending) {
      return NextResponse.json({ error: "Ya tienes una solicitud pendiente" }, { status: 409 });
    }

    await prismaWithAccessRequest.accessRequest.create({
      data: {
        email,
        username,
        firstName,
        lastName,
      },
    });

    return NextResponse.json({ message: "Solicitud enviada correctamente" }, { status: 201 });
  } catch (error) {
    console.error("ACCESS_REQUEST_CREATE_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
