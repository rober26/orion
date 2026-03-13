import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/src/lib/prisma";

export async function POST(request: Request) {
  try {
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: "El sistema ya ha sido configurado. Esta ruta esta inhabilitada." },
        { status: 403 }
      );
    }

    const { email, password, username } = await request.json();

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        username: username.trim(),
        passwordHash: hashedPassword,
        role: "ADMIN"
      }
    });

    return NextResponse.json({ message: "Administrador configurado con exito" }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Error en el setup" }, { status: 500 });
  }
}