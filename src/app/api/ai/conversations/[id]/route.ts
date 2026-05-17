import { json, serverError, unauthorized } from "../../../../../lib/http";
import { resolveAiActorUserId } from "../../../../../lib/ai/auth";
import { getAiClient } from "../../../../../lib/ai/client";
import { LOCAL_ONLY_AI_PROVIDER, providerProfile } from "../../../../../lib/ai/constants";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateConversationBody = {
  connectionId?: unknown;
  title?: unknown;
  personaStyle?: unknown;
  primaryFunction?: unknown;
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

type MessageRecord = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
};

export async function GET(_request: Request, context: Context) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const { id } = await context.params;

    const conversation = (await aiClient.aiConversation.findFirst({
      where: {
        id,
        userId: actorUserId,
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
    })) as ConversationRecord | null;

    if (!conversation) {
      return json({ error: "Conversacion no encontrada" }, 404);
    }

    const messages = (await aiClient.aiMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })) as MessageRecord[];

    return json({
      id: conversation.id,
      title: conversation.title,
      personaStyle: conversation.personaStyle,
      primaryFunction: conversation.primaryFunction,
      model: conversation.model,
      provider: conversation.provider,
      connectionId: conversation.connectionId,
      connectionName: conversation.connection?.name ?? null,
      updatedAt: conversation.updatedAt.toISOString(),
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET_AI_CONVERSATION_DETAIL_ERROR", error);
    return serverError();
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateConversationBody;
    const titleInput = typeof body.title === "string" ? body.title.trim() : "";
    const personaStyleInput = typeof body.personaStyle === "string" ? body.personaStyle.trim() : "";
    const primaryFunctionInput = typeof body.primaryFunction === "string" ? body.primaryFunction.trim() : "";
    const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";

    if (titleInput && titleInput.length > 160) {
      return json({ error: "El titulo no puede superar 160 caracteres" }, 400);
    }

    if (personaStyleInput.length > 160) {
      return json({ error: "La personalidad no puede superar 160 caracteres" }, 400);
    }

    if (primaryFunctionInput.length > 160) {
      return json({ error: "La funcion principal no puede superar 160 caracteres" }, 400);
    }

    const conversation = (await aiClient.aiConversation.findFirst({
      where: {
        id,
        userId: actorUserId,
      },
      select: { id: true, connectionId: true, personaStyle: true, primaryFunction: true },
    })) as { id: string; connectionId: string | null; personaStyle: string | null; primaryFunction: string | null } | null;

    if (!conversation) {
      return json({ error: "Conversacion no encontrada" }, 404);
    }

    if (titleInput.length > 0 || body.personaStyle !== undefined || body.primaryFunction !== undefined) {
      await aiClient.aiConversation.update({
        where: { id: conversation.id },
        data: {
          ...(titleInput.length > 0 ? { title: titleInput } : {}),
          ...(body.personaStyle !== undefined ? { personaStyle: personaStyleInput || null } : {}),
          ...(body.primaryFunction !== undefined ? { primaryFunction: primaryFunctionInput || null } : {}),
        },
      });

      return json({ ok: true });
    }

    if (!connectionId) {
      return json({ error: "Debes indicar una conexion valida" }, 400);
    }

    const connection = (await aiClient.userAiConnection.findFirst({
      where: {
        id: connectionId,
        userId: actorUserId,
      },
      select: {
        id: true,
        provider: true,
        model: true,
      },
    })) as { id: string; provider: string; model: string } | null;

    if (!connection) {
      return json({ error: "Conexion IA no encontrada" }, 404);
    }

    const provider = LOCAL_ONLY_AI_PROVIDER;
    const profile = providerProfile(provider);

    if (conversation.connectionId === connection.id) {
      return json({ ok: true });
    }

    await aiClient.aiConversation.update({
      where: { id: conversation.id },
      data: {
        connectionId: connection.id,
        provider,
        model: connection.model || profile.defaultModel,
      },
    });

    return json({ ok: true });
  } catch (error) {
    console.error("PATCH_AI_CONVERSATION_ERROR", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const { id } = await context.params;

    const deleted = await aiClient.aiConversation.deleteMany({
      where: {
        id,
        userId: actorUserId,
      },
    });

    if (deleted.count === 0) {
      return json({ error: "Conversacion no encontrada" }, 404);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("DELETE_AI_CONVERSATION_ERROR", error);
    return serverError();
  }
}
