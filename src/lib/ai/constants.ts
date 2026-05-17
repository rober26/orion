export type AiProviderId = "GITHUB_MODELS" | "OPENAI_COMPATIBLE" | "SELF_HOSTED_OPENAI";

export type AiProviderProfile = {
  id: AiProviderId;
  label: string;
  description: string;
  defaultModel: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  apiKeyLabel: string;
};

export const AI_PROVIDER_PROFILES: Record<AiProviderId, AiProviderProfile> = {
  GITHUB_MODELS: {
    id: "GITHUB_MODELS",
    label: "GitHub Models",
    description: "Usa tu token de GitHub para acceder a modelos desde GitHub.",
    defaultModel: "openai/gpt-4.1-mini",
    defaultBaseUrl: "https://models.inference.ai.azure.com",
    requiresApiKey: true,
    apiKeyLabel: "GitHub token",
  },
  OPENAI_COMPATIBLE: {
    id: "OPENAI_COMPATIBLE",
    label: "OpenAI compatible",
    description: "Proveedor compatible con /chat/completions estilo OpenAI.",
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    apiKeyLabel: "API key",
  },
  SELF_HOSTED_OPENAI: {
    id: "SELF_HOSTED_OPENAI",
    label: "Servidor propio",
    description: "Instancia privada local/remota compatible con OpenAI.",
    defaultModel: "llama3.1:8b",
    defaultBaseUrl: "http://localhost:11434/v1",
    requiresApiKey: false,
    apiKeyLabel: "Token opcional",
  },
};

export const LOCAL_ONLY_AI_PROVIDER: AiProviderId = "SELF_HOSTED_OPENAI";
export const LOCAL_AI_PROVIDER_OPTIONS: AiProviderProfile[] = [AI_PROVIDER_PROFILES[LOCAL_ONLY_AI_PROVIDER]];

export const DEFAULT_AI_PROVIDER: AiProviderId = LOCAL_ONLY_AI_PROVIDER;
export const DEFAULT_AI_MODEL = AI_PROVIDER_PROFILES[DEFAULT_AI_PROVIDER].defaultModel;
export const MAX_CHAT_MESSAGE_LENGTH = 6000;
export const AI_SYSTEM_PROMPT =
  "Eres un asistente util, claro y directo. Responde en espanol cuando el usuario escriba en espanol.";

export function isAiProvider(value: unknown): value is AiProviderId {
  return value === "GITHUB_MODELS" || value === "OPENAI_COMPATIBLE" || value === "SELF_HOSTED_OPENAI";
}

export function providerProfile(provider: AiProviderId): AiProviderProfile {
  return AI_PROVIDER_PROFILES[provider];
}
