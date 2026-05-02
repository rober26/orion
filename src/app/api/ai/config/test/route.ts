import { badRequest, json, serverError, unauthorized } from "../../../../../lib/http";
import { resolveAiActorUserId } from "../../../../../lib/ai/auth";
import { getAiClient } from "../../../../../lib/ai/client";
import { readStoredSecret } from "../../../../../lib/ai/crypto";
import { sendOpenAiCompatibleChat } from "../../../../../lib/ai/provider";
import { isAiProvider, providerProfile } from "../../../../../lib/ai/constants";

type ConfigRecord = {
  provider: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  requiresApiKey: boolean;
};

export async function POST(request: Request) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => ({}))) as {
      provider?: unknown;
      model?: unknown;
      baseUrl?: unknown;
      apiKey?: unknown;
      requiresApiKey?: unknown;
    };

    const storedConfig = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        model: true,
        baseUrl: true,
        encryptedApiKey: true,
        requiresApiKey: true,
        provider: true,
      },
    })) as ConfigRecord | null;

    const providerCandidate = typeof body.provider === "string" ? body.provider : storedConfig?.provider;
    const provider = isAiProvider(providerCandidate) ? providerCandidate : "OPENAI_COMPATIBLE";
    const profile = providerProfile(provider);
    const model =
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : (storedConfig?.model || profile.defaultModel);
    const baseUrl =
      typeof body.baseUrl === "string" && body.baseUrl.trim().length > 0
        ? body.baseUrl.trim()
        : (storedConfig?.baseUrl || profile.defaultBaseUrl);
    const requiresApiKey =
      typeof body.requiresApiKey === "boolean"
        ? body.requiresApiKey
        : (storedConfig?.requiresApiKey ?? profile.requiresApiKey);
    const apiKey =
      typeof body.apiKey === "string" && body.apiKey.trim().length > 0
        ? body.apiKey.trim()
        : readStoredSecret(storedConfig?.encryptedApiKey);

    if (!model) {
      return badRequest("Debes indicar un modelo para probar la conexion");
    }

    if (!baseUrl) {
      return badRequest("Debes indicar una Base URL para probar la conexion");
    }

    if (requiresApiKey && !apiKey) {
      return badRequest("API key no configurada");
    }

    const response = await sendOpenAiCompatibleChat({
      apiKey,
      model,
      baseUrl,
      messages: [{ role: "user", content: "Responde exactamente: conexion ok" }],
      timeoutMs: 30000,
    });

    return json({
      ok: true,
      provider,
      providerLabel: profile.label,
      endpoint: baseUrl.replace(/\/$/, "") + "/chat/completions",
      authMode: requiresApiKey ? "bearer" : "none",
      reply: response.text,
    });
  } catch (error) {
    console.error("TEST_AI_CONFIG_ERROR", error);
    return serverError(error instanceof Error ? error.message : "No se pudo probar la conexion IA");
  }
}
