import { ConnectionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (action !== "accept" && action !== "reject" && action !== "cancel") {
      return NextResponse.json({ error: "Accion invalida" }, { status: 400 });
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id,
        OR: [{ requesterId: sessionUser.userId }, { receiverId: sessionUser.userId }],
      },
      select: { id: true, requesterId: true, receiverId: true, status: true },
    });

    if (!connection) {
      return NextResponse.json({ error: "Conexion no encontrada" }, { status: 404 });
    }

    if (action === "cancel") {
      if (connection.status !== ConnectionStatus.PENDING) {
        return NextResponse.json({ error: "Solo puedes cancelar solicitudes pendientes" }, { status: 409 });
      }
      if (connection.requesterId !== sessionUser.userId) {
        return NextResponse.json({ error: "Solo el solicitante puede cancelar" }, { status: 403 });
      }

      await prisma.connection.delete({ where: { id: connection.id } });
      return NextResponse.json({ message: "Solicitud cancelada" });
    }

    if (connection.receiverId !== sessionUser.userId) {
      return NextResponse.json({ error: "Solo el receptor puede aceptar o rechazar" }, { status: 403 });
    }

    if (connection.status !== ConnectionStatus.PENDING) {
      return NextResponse.json({ error: "La solicitud ya fue resuelta" }, { status: 409 });
    }

    const nextStatus = action === "accept" ? ConnectionStatus.ACCEPTED : ConnectionStatus.REJECTED;

    const updated = await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: nextStatus,
        acceptedAt: action === "accept" ? new Date() : null,
      },
      select: { id: true, status: true, acceptedAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("UPDATE_CONNECTION_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const connection = await prisma.connection.findFirst({
      where: {
        id,
        status: ConnectionStatus.ACCEPTED,
        OR: [{ requesterId: sessionUser.userId }, { receiverId: sessionUser.userId }],
      },
      select: { id: true },
    });

    if (!connection) {
      return NextResponse.json({ error: "Conexion no encontrada" }, { status: 404 });
    }

    await prisma.connection.delete({ where: { id: connection.id } });

    return NextResponse.json({ message: "Conexion eliminada" });
  } catch (error) {
    console.error("DELETE_CONNECTION_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
