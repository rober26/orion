export type AiProvider = "GITHUB_MODELS" | "OPENAI_COMPATIBLE" | "SELF_HOSTED_OPENAI";
export type AiMessageRole = "system" | "user" | "assistant";

export interface AiProviderOption {
  id: AiProvider;
  label: string;
  description: string;
  defaultModel: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  apiKeyLabel: string;
}

export interface AiConfigView {
  provider: AiProvider;
  model: string;
  baseUrl: string | null;
  isActive: boolean;
  requiresApiKey: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  updatedAt: string | null;
  providerOptions?: AiProviderOption[];
  connections?: AiConnection[];
  defaultConnectionId?: string;
  lastSavedConnectionId?: string;
}

export interface AiConnection {
  id: string;
  name: string;
  provider: AiProvider;
  model: string;
  baseUrl: string | null;
  requiresApiKey: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  isDefault: boolean;
  updatedAt: string;
}

export interface AiConversationListItem {
  id: string;
  title: string;
  model: string;
  provider: AiProvider;
  connectionId: string | null;
  connectionName: string | null;
  updatedAt: string;
  messageCount: number;
}

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

export interface AiConversationDetail {
  id: string;
  title: string;
  model: string;
  provider: AiProvider;
  connectionId: string | null;
  connectionName: string | null;
  updatedAt: string;
  messages: AiMessage[];
}
