import { badRequest, json, serverError, unauthorized } from "../../../../lib/http";
import { resolveAiActorUserId } from "../../../../lib/ai/auth";
import { getAiClient } from "../../../../lib/ai/client";
import { AI_SYSTEM_PROMPT, DEFAULT_AI_MODEL, MAX_CHAT_MESSAGE_LENGTH, providerProfile } from "../../../../lib/ai/constants";
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
  personaStyle: string | null;
  primaryFunction: string | null;
  model: string;
  provider: string;
  connectionId: string | null;
};

type UserAiConfigRecord = {
  preferredLanguage: string;
  preferredName: string | null;
};

type UserRecord = {
  username: string;
};

function buildRuntimeSystemPrompt(input: {
  preferredLanguage: string;
  preferredName: string;
  personaStyle: string | null;
  primaryFunction: string | null;
}): string {
  const persona = input.personaStyle || "claro y colaborativo";
  const functionRole = input.primaryFunction || "asistente general";

  return [
    AI_SYSTEM_PROMPT,
    "",
    "Preferencias persistentes del usuario:",
    `- Responde siempre en idioma: ${input.preferredLanguage}`,
    `- Dirigete al usuario como: ${input.preferredName}`,
    "",
    "Configuracion de esta conversacion:",
    `- Estilo de personalidad: ${persona}`,
    `- Funcion principal: ${functionRole}`,
    "",
    "Debes mantener estas preferencias en toda la conversacion.",
  ].join("\n");
}

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

    let body: SendMessageBody;

    try {
      body = (await request.json()) as SendMessageBody;
    } catch {
      return badRequest("Formato de solicitud invalido");
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return badRequest("El mensaje no puede estar vacio");
    }

    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      return badRequest(`El mensaje no puede superar ${MAX_CHAT_MESSAGE_LENGTH} caracteres`);
    }

    const { defaultConnectionId } = await ensureUserConnections(actorUserId, { createIfMissing: false });

    if (!defaultConnectionId && !conversationId) {
      return badRequest("Primero configura una conexion IA para iniciar el chat");
    }

    let conversation: ConversationRecord | null = conversationId
      ? await aiClient.aiConversation.findFirst({
          where: {
            id: conversationId,
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
      return badRequest("No se encontro una conexion IA valida. Configura una conexion en el panel IA");
    }

    const connectionProvider = "SELF_HOSTED_OPENAI";
    const connectionProfile = providerProfile(connectionProvider);
    const connectionModel = activeConnection.model || connectionProfile.defaultModel;

    if (!conversation) {
      conversation = await aiClient.aiConversation.create({
        data: {
          userId: actorUserId,
          title: buildConversationTitle(content),
          personaStyle: null,
          primaryFunction: null,
          connectionId: activeConnection.id,
          provider: connectionProvider,
          model: connectionModel,
        },
        select: {
          id: true,
          title: true,
          personaStyle: true,
          primaryFunction: true,
          model: true,
          provider: true,
          connectionId: true,
        },
      }) as ConversationRecord;
    }

    const recentHistory = (await aiClient.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        role: true,
        content: true,
      },
    })) as MessageHistoryRecord[];

    const history = [...recentHistory].reverse();

    const [userPreferences, userRecord] = await Promise.all([
      aiClient.userAiConfig.findUnique({
        where: { userId: actorUserId },
        select: {
          preferredLanguage: true,
          preferredName: true,
        },
      }) as Promise<UserAiConfigRecord | null>,
      aiClient.user.findUnique({
        where: { id: actorUserId },
        select: { username: true },
      }) as Promise<UserRecord | null>,
    ]);

    const runtimeSystemPrompt = buildRuntimeSystemPrompt({
      preferredLanguage: userPreferences?.preferredLanguage || "es",
      preferredName: userPreferences?.preferredName || userRecord?.username || "Usuario",
      personaStyle: conversation.personaStyle,
      primaryFunction: conversation.primaryFunction,
    });

    const providerResponse = await sendOpenAiCompatibleChat({
      model: connectionModel || conversation.model || DEFAULT_AI_MODEL,
      baseUrl: activeConnection.baseUrl || connectionProfile.defaultBaseUrl,
      messages: [
        { role: "system", content: runtimeSystemPrompt },
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
