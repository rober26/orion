import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("orion_session")?.value;

    if (!token) {
      console.log("Error:No se encontró la cookie orion_session");
      return NextResponse.json({ error: "No hay token" }, { status: 401 });
    }

    // 2. Verificar el Token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_for_dev_only");
    } catch (err) {
      console.log("Error: Token inválido o expirado");
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // 3. Buscar en Base de Datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        username: true, 
        firstName: true,
        role: true 
      }
    });

    if (!user) {
      console.log(`Error : Usuario ID ${decoded.userId} no existe en DB`);
      return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
    }

    console.log(`Usuario ${user.username} cargado con exito`);
    return NextResponse.json(user);

  } catch (error: any) {
    console.error("ERROR:", error.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}