import { badRequest, json, serverError, unauthorized } from "../../../../lib/http";
import { resolveAiActorUserId } from "../../../../lib/ai/auth";
import { getAiClient } from "../../../../lib/ai/client";
import {
  AI_SYSTEM_PROMPT,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  MAX_CHAT_MESSAGE_LENGTH,
  isAiProvider,
  providerProfile,
} from "../../../../lib/ai/constants";
import { readStoredSecret } from "../../../../lib/ai/crypto";
import { sendOpenAiCompatibleChat } from "../../../../lib/ai/provider";
import { ensureUserConnections } from "../../../../lib/ai/connections";

type AiMessageRole = "system" | "user" | "assistant";

type SendMessageBody = {
  conversationId?: unknown;
  content?: unknown;
};

type ConnectionRecord = {
  id: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  requiresApiKey: boolean;
};

type ConversationRecord = {
  id: string;
  title: string;
  model: string;
  provider: string;
  connectionId: string | null;
};

type MessageHistoryRecord = {
  role: string;
  content: string;
};

function buildConversationTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  const base = cleaned || "Nueva conversacion";

  return base.length > 80 ? `${base.slice(0, 77)}...` : base;
}

export async function POST(request: Request) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const body = (await request.json()) as SendMessageBody;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return badRequest("El mensaje no puede estar vacio");
    }

    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      return badRequest(`El mensaje no puede superar ${MAX_CHAT_MESSAGE_LENGTH} caracteres`);
    }

    const { defaultConnectionId } = await ensureUserConnections(actorUserId);

    let conversation: ConversationRecord | null = conversationId
      ? await aiClient.aiConversation.findFirst({
          where: {
            id: conversationId,
            userId: actorUserId,
          },
          select: {
            id: true,
            title: true,
            model: true,
            provider: true,
            connectionId: true,
          },
        }) as ConversationRecord | null
      : null;

    const activeConnectionId = conversation?.connectionId || defaultConnectionId;
    const activeConnection = (await aiClient.userAiConnection.findFirst({
      where: {
        id: activeConnectionId,
        userId: actorUserId,
      },
      select: {
        id: true,
        provider: true,
        model: true,
        baseUrl: true,
        encryptedApiKey: true,
        requiresApiKey: true,
      },
    })) as ConnectionRecord | null;

    if (!activeConnection) {
      return badRequest("No se encontro una conexion IA valida para esta conversacion");
    }

    const connectionProvider = isAiProvider(activeConnection.provider)
      ? activeConnection.provider
      : DEFAULT_AI_PROVIDER;
    const connectionProfile = providerProfile(connectionProvider);
    const connectionModel = activeConnection.model || connectionProfile.defaultModel;
    const connectionApiKey = readStoredSecret(activeConnection.encryptedApiKey);

    if (activeConnection.requiresApiKey && !connectionApiKey) {
      return badRequest("La conexion IA seleccionada requiere API key");
    }

    if (!conversation) {
      conversation = await aiClient.aiConversation.create({
        data: {
          userId: actorUserId,
          title: buildConversationTitle(content),
          connectionId: activeConnection.id,
          provider: connectionProvider,
          model: connectionModel,
        },
        select: {
          id: true,
          title: true,
          model: true,
          provider: true,
          connectionId: true,
        },
      }) as ConversationRecord;
    }

    const history = (await aiClient.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 24,
      select: {
        role: true,
        content: true,
      },
    })) as MessageHistoryRecord[];

    const providerResponse = await sendOpenAiCompatibleChat({
      apiKey: connectionApiKey,
      model: connectionModel || conversation.model || DEFAULT_AI_MODEL,
      baseUrl: activeConnection.baseUrl || connectionProfile.defaultBaseUrl,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        ...history
          .filter((message) =>
            message.role === "system" || message.role === "user" || message.role === "assistant",
          )
          .map((message) => ({ role: message.role as AiMessageRole, content: message.content })),
        { role: "user", content },
      ],
    });

    await aiClient.aiMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: "user",
          content,
          tokensIn: providerResponse.usage?.promptTokens,
        },
        {
          conversationId: conversation.id,
          role: "assistant",
          content: providerResponse.text,
          tokensOut: providerResponse.usage?.completionTokens,
        },
      ],
    });

    await aiClient.aiConversation.update({
      where: { id: conversation.id },
      data: {
        connectionId: activeConnection.id,
        provider: connectionProvider,
        model: connectionModel || conversation.model,
      },
    });

    return json({
      conversationId: conversation.id,
      assistantMessage: providerResponse.text,
    });
  } catch (error) {
    console.error("POST_AI_CHAT_ERROR", error);
    return serverError(error instanceof Error ? error.message : "No se pudo procesar el chat IA");
  }
}
