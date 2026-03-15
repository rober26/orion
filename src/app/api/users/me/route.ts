import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies(); 
    const token = cookieStore.get("orion_session")?.value;

    if (!token) {
      console.log("❌ Error: No se encontró la cookie orion_session");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_for_dev_only");
    } catch (err) {
      console.log("❌ Error: Token inválido o expirado");
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true,      
        username: true, 
        firstName: true,
        role: true 
      }
    });

    if (!user) {
      console.log(`Error: Usuario ID ${decoded.userId} no existe en DB`);
      return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
    }

    console.log(`Usuario ${user.username} cargado con exito`);
    return NextResponse.json(user);

  } catch (error: any) {
    console.error("Error en el servidor:", error.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}