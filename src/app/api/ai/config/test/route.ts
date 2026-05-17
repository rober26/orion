import { badRequest, json, serverError, unauthorized } from "../../../../../lib/http";
import { resolveAiActorUserId } from "../../../../../lib/ai/auth";
import { getAiClient } from "../../../../../lib/ai/client";
import { sendOpenAiCompatibleChat } from "../../../../../lib/ai/provider";
import { LOCAL_ONLY_AI_PROVIDER, providerProfile } from "../../../../../lib/ai/constants";
import { assertSafeAiBaseUrl } from "../../../../../lib/ai/base-url";

type ConfigRecord = {
  model: string;
  baseUrl: string | null;
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
    };

    const storedConfig = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        model: true,
        baseUrl: true,
      },
    })) as ConfigRecord | null;

    const provider = LOCAL_ONLY_AI_PROVIDER;

    if (body.provider !== undefined && body.provider !== LOCAL_ONLY_AI_PROVIDER) {
      return badRequest("Solo se permiten conexiones IA locales");
    }

    const profile = providerProfile(provider);
    const model =
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : (storedConfig?.model || profile.defaultModel);
    const baseUrl =
      typeof body.baseUrl === "string" && body.baseUrl.trim().length > 0
        ? body.baseUrl.trim()
        : (storedConfig?.baseUrl || profile.defaultBaseUrl);

    if (!model) {
      return badRequest("Debes indicar un modelo para probar la conexion");
    }

    if (!baseUrl) {
      return badRequest("Debes indicar una Base URL para probar la conexion");
    }

    try {
      assertSafeAiBaseUrl(baseUrl, provider);
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : "Base URL invalida");
    }

    const response = await sendOpenAiCompatibleChat({
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
      authMode: "none",
      reply: response.text,
    });
  } catch (error) {
    console.error("TEST_AI_CONFIG_ERROR", error);
    return serverError(error instanceof Error ? error.message : "No se pudo probar la conexion IA");
  }
}
