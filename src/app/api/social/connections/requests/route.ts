import { ConnectionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId es obligatorio" }, { status: 400 });
    }

    if (targetUserId === sessionUser.userId) {
      return NextResponse.json({ error: "No puedes conectarte contigo mismo" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: "Usuario destino no disponible" }, { status: 404 });
    }

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: sessionUser.userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: sessionUser.userId },
        ],
      },
      select: { id: true, status: true, requesterId: true, receiverId: true },
    });

    if (existing?.status === ConnectionStatus.ACCEPTED) {
      return NextResponse.json({ error: "Ya estan conectados" }, { status: 409 });
    }

    if (existing?.status === ConnectionStatus.PENDING) {
      if (existing.requesterId === sessionUser.userId) {
        return NextResponse.json({ error: "Ya enviaste una solicitud pendiente" }, { status: 409 });
      }

      return NextResponse.json({
        message: "Solicitud recíproca detectada. Se aceptó la conexión automáticamente.",
        connection: await prisma.connection.update({
          where: { id: existing.id },
          data: { status: ConnectionStatus.ACCEPTED, acceptedAt: new Date() },
          select: { id: true, status: true, acceptedAt: true },
        }),
      });
    }

    if (existing?.status === ConnectionStatus.REJECTED) {
      const reactivated = await prisma.connection.update({
        where: { id: existing.id },
        data: {
          requesterId: sessionUser.userId,
          receiverId: targetUserId,
          status: ConnectionStatus.PENDING,
          acceptedAt: null,
          createdAt: new Date(),
        },
        select: { id: true, status: true, createdAt: true },
      });

      return NextResponse.json(reactivated, { status: 201 });
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: sessionUser.userId,
        receiverId: targetUserId,
        status: ConnectionStatus.PENDING,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("CREATE_CONNECTION_REQUEST_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
