import { ConnectionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const acceptedOnly = searchParams.get("acceptedOnly") === "true";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: sessionUser.userId }, { receiverId: sessionUser.userId }],
      },
      select: { requesterId: true, receiverId: true, status: true },
    });

    const statusByUser = new Map<string, ConnectionStatus>();
    for (const connection of connections) {
      const otherUserId =
        connection.requesterId === sessionUser.userId ? connection.receiverId : connection.requesterId;
      statusByUser.set(otherUserId, connection.status);
    }

    const acceptedIds = [...statusByUser.entries()]
      .filter((entry) => entry[1] === ConnectionStatus.ACCEPTED)
      .map((entry) => entry[0]);

    const users = await prisma.user.findMany({
      where: {
        id: acceptedOnly
          ? { in: acceptedIds }
          : { not: sessionUser.userId },
        isActive: true,
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        connectionStatus: statusByUser.get(user.id) || null,
      })),
    );
  } catch (error) {
    console.error("SEARCH_SOCIAL_USERS_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
