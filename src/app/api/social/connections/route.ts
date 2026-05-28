import { ConnectionStatus } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { json, serverError, unauthorized } from "@/src/lib/http";

function toUserSummary(user: { id: string; username: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  };
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const [incomingPending, outgoingPending, accepted] = await Promise.all([
      prisma.connection.findMany({
        where: { receiverId: sessionUser.userId, status: ConnectionStatus.PENDING },
        orderBy: { createdAt: "desc" },
        include: {
          requester: {
            select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.connection.findMany({
        where: { requesterId: sessionUser.userId, status: ConnectionStatus.PENDING },
        orderBy: { createdAt: "desc" },
        include: {
          receiver: {
            select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.connection.findMany({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ requesterId: sessionUser.userId }, { receiverId: sessionUser.userId }],
        },
        orderBy: { acceptedAt: "desc" },
        include: {
          requester: {
            select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
          },
          receiver: {
            select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return json({
      incomingPending: incomingPending.map((connection) => ({
        id: connection.id,
        createdAt: connection.createdAt,
        user: toUserSummary(connection.requester),
      })),
      outgoingPending: outgoingPending.map((connection) => ({
        id: connection.id,
        createdAt: connection.createdAt,
        user: toUserSummary(connection.receiver),
      })),
      accepted: accepted.map((connection) => {
        const otherUser = connection.requesterId === sessionUser.userId ? connection.receiver : connection.requester;
        return {
          id: connection.id,
          acceptedAt: connection.acceptedAt,
          user: toUserSummary(otherUser),
        };
      }),
    });
  } catch (error) {
    console.error("GET_CONNECTIONS_ERROR", error);
    return serverError();
  }
}
