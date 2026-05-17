import { badRequest, json, serverError, unauthorized } from "../../../../lib/http";
import { resolveAiActorUserId } from "../../../../lib/ai/auth";
import { getAiClient } from "../../../../lib/ai/client";
import { DEFAULT_AI_MODEL, LOCAL_ONLY_AI_PROVIDER } from "../../../../lib/ai/constants";
import { ensureUserConnections } from "../../../../lib/ai/connections";

type CreateConversationBody = {
  title?: unknown;
};

type ConversationListRecord = {
  id: string;
  title: string;
  personaStyle: string | null;
  primaryFunction: string | null;
  model: string;
  provider: string;
  connectionId: string | null;
  connection: {
    name: string;
  } | null;
  updatedAt: Date;
  _count: {
    messages: number;
  };
};

type ConversationRecord = {
  id: string;
  title: string;
  personaStyle: string | null;
  primaryFunction: string | null;
  model: string;
  provider: string;
  connectionId: string | null;
  connection: {
    name: string;
  } | null;
  updatedAt: Date;
};

export async function GET() {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    await ensureUserConnections(actorUserId, { createIfMissing: false });

    const conversations = (await aiClient.aiConversation.findMany({
      where: { userId: actorUserId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        personaStyle: true,
        primaryFunction: true,
        model: true,
        provider: true,
        connectionId: true,
        connection: {
          select: { name: true },
        },
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    })) as ConversationListRecord[];

    return json(
      conversations.map((item) => ({
        id: item.id,
        title: item.title,
        personaStyle: item.personaStyle,
        primaryFunction: item.primaryFunction,
        model: item.model,
        provider: item.provider,
        connectionId: item.connectionId,
        connectionName: item.connection?.name ?? null,
        updatedAt: item.updatedAt.toISOString(),
        messageCount: item._count.messages,
      })),
    );
  } catch (error) {
    console.error("GET_AI_CONVERSATIONS_ERROR", error);
    return serverError();
  }
}

export async function POST(request: Request) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const body = (await request.json()) as CreateConversationBody;
    const titleInput = typeof body.title === "string" ? body.title.trim() : "";

    if (titleInput.length > 160) {
      return badRequest("El titulo no puede superar 160 caracteres");
    }

    const { connections, defaultConnectionId } = await ensureUserConnections(actorUserId, { createIfMissing: false });

    if (!defaultConnectionId) {
      return badRequest("Primero configura una conexion IA para crear conversaciones");
    }

    const selectedConnection = connections.find((connection) => connection.id === defaultConnectionId);

    if (!selectedConnection) {
      return badRequest("No se encontro una conexion IA predeterminada valida");
    }

    const provider = LOCAL_ONLY_AI_PROVIDER;
    const model = selectedConnection.model || DEFAULT_AI_MODEL;

    const conversation = (await aiClient.aiConversation.create({
      data: {
        userId: actorUserId,
        connectionId: selectedConnection.id,
        title: titleInput || "Nueva conversacion",
        personaStyle: null,
        primaryFunction: null,
        provider,
        model,
      },
      select: {
        id: true,
        title: true,
        personaStyle: true,
        primaryFunction: true,
        model: true,
        provider: true,
        connectionId: true,
        connection: {
          select: { name: true },
        },
        updatedAt: true,
      },
    })) as ConversationRecord;

    return json(
      {
        id: conversation.id,
        title: conversation.title,
        personaStyle: conversation.personaStyle,
        primaryFunction: conversation.primaryFunction,
        model: conversation.model,
        provider: conversation.provider,
        connectionId: conversation.connectionId,
        connectionName: conversation.connection?.name ?? null,
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: 0,
      },
      201,
    );
  } catch (error) {
    console.error("POST_AI_CONVERSATIONS_ERROR", error);
    return serverError();
  }
}
