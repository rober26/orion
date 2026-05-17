type AiMessageRole = "system" | "user" | "assistant";

type ProviderRequestMessage = {
  role: AiMessageRole;
  content: string;
};

type ProviderResponse = {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

type OpenAiMessage = {
  role: AiMessageRole;
  content: string;
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

function resolveProviderTimeoutMs(explicitTimeoutMs?: number): number {
  if (typeof explicitTimeoutMs === "number" && Number.isFinite(explicitTimeoutMs) && explicitTimeoutMs > 0) {
    return Math.min(explicitTimeoutMs, 15 * 60 * 1000);
  }

  const rawFromEnv = process.env.AI_REQUEST_TIMEOUT_MS;
  const parsedFromEnv = rawFromEnv ? Number.parseInt(rawFromEnv, 10) : Number.NaN;

  if (Number.isFinite(parsedFromEnv) && parsedFromEnv > 0) {
    return Math.min(parsedFromEnv, 15 * 60 * 1000);
  }

  return 180000;
}

export async function sendOpenAiCompatibleChat(params: {
  apiKey?: string;
  model: string;
  baseUrl?: string | null;
  messages: ProviderRequestMessage[];
  timeoutMs?: number;
}): Promise<ProviderResponse> {
  const baseUrl = params.baseUrl?.trim() || "https://api.openai.com/v1";
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeoutMs = resolveProviderTimeoutMs(params.timeoutMs);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (params.apiKey && params.apiKey.trim().length > 0) {
      headers.Authorization = `Bearer ${params.apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map((message): OpenAiMessage => ({
          role: message.role,
          content: message.content,
        })),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = (await res.json()) as OpenAiResponse | { error?: { message?: string } };

    if (!res.ok) {
      const errorMessage =
        "error" in payload && payload.error?.message
          ? payload.error.message
          : "No se pudo completar la solicitud al proveedor IA";
      throw new Error(errorMessage);
    }

    const content = (payload as OpenAiResponse).choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("El proveedor IA devolvio una respuesta vacia");
    }

    const usage = (payload as OpenAiResponse).usage;

    return {
      text: content,
      usage: {
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("La solicitud al proveedor IA excedio el tiempo limite");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
