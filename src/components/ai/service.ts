import type {
  AiConfigView,
  AiConversationDetail,
  AiConversationListItem,
  AiProvider,
} from "./types";

interface ApiError {
  error?: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T | ApiError;

  if (!res.ok) {
    throw new Error((data as ApiError)?.error || "Error inesperado");
  }

  return data as T;
}

export async function getAiConfig(): Promise<AiConfigView> {
  const res = await fetch("/api/ai/config", { cache: "no-store" });
  return parseResponse<AiConfigView>(res);
}

export async function updateAiConfig(payload: {
  connectionId?: string;
  connectionName?: string;
  createNew?: boolean;
  makeDefault?: boolean;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  apiKey?: string;
  isActive: boolean;
  requiresApiKey: boolean;
}): Promise<AiConfigView> {
  const res = await fetch("/api/ai/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<AiConfigView>(res);
}

export async function testAiConfig(payload?: {
  provider?: AiProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  requiresApiKey?: boolean;
}): Promise<{
  ok: boolean;
  provider: string;
  providerLabel: string;
  endpoint: string;
  authMode: string;
  reply: string;
}> {
  const res = await fetch("/api/ai/config/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  return parseResponse<{
    ok: boolean;
    provider: string;
    providerLabel: string;
    endpoint: string;
    authMode: string;
    reply: string;
  }>(res);
}

export async function getAiConversations(): Promise<AiConversationListItem[]> {
  const res = await fetch("/api/ai/conversations", { cache: "no-store" });
  return parseResponse<AiConversationListItem[]>(res);
}

export async function createAiConversation(title?: string): Promise<AiConversationListItem> {
  const res = await fetch("/api/ai/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  return parseResponse<AiConversationListItem>(res);
}

export async function updateAiConversationConnection(conversationId: string, connectionId: string): Promise<void> {
  const res = await fetch(`/api/ai/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId }),
  });

  await parseResponse<{ ok: true }>(res);
}

export async function getAiConversationDetail(conversationId: string): Promise<AiConversationDetail> {
  const res = await fetch(`/api/ai/conversations/${conversationId}`, { cache: "no-store" });
  return parseResponse<AiConversationDetail>(res);
}

export async function deleteAiConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/ai/conversations/${conversationId}`, {
    method: "DELETE",
  });

  await parseResponse<{ ok: true }>(res);
}

export async function sendAiMessage(payload: {
  conversationId?: string;
  content: string;
}): Promise<{ conversationId: string; assistantMessage: string }> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ conversationId: string; assistantMessage: string }>(res);
}
