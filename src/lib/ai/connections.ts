import { getAiClient } from "./client";
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, isAiProvider, providerProfile } from "./constants";
import { encryptSecret, readStoredSecret } from "./crypto";

type ConnectionRecord = {
  id: string;
  userId: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  requiresApiKey: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type LegacyConfig = {
  provider: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  requiresApiKey: boolean;
};

export type NormalizedAiConnection = {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  requiresApiKey: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  isDefault: boolean;
  updatedAt: string;
};

function maskApiKey(secret: string): string | null {
  if (!secret) {
    return null;
  }

  if (secret.length <= 8) {
    return "********";
  }

  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

function normalizeConnection(record: ConnectionRecord): NormalizedAiConnection {
  const secret = readStoredSecret(record.encryptedApiKey);

  return {
    id: record.id,
    name: record.name,
    provider: isAiProvider(record.provider) ? record.provider : DEFAULT_AI_PROVIDER,
    model: record.model,
    baseUrl: record.baseUrl,
    requiresApiKey: record.requiresApiKey,
    hasApiKey: secret.length > 0,
    maskedApiKey: maskApiKey(secret),
    isDefault: record.isDefault,
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function createDefaultConnectionFromLegacy(userId: string): Promise<ConnectionRecord> {
  const aiClient = getAiClient();
  const legacyConfig = (await aiClient.userAiConfig.findUnique({
    where: { userId },
    select: {
      provider: true,
      model: true,
      baseUrl: true,
      encryptedApiKey: true,
      requiresApiKey: true,
    },
  })) as LegacyConfig | null;

  const provider = isAiProvider(legacyConfig?.provider) ? legacyConfig.provider : DEFAULT_AI_PROVIDER;
  const profile = providerProfile(provider);

  const created = (await aiClient.userAiConnection.create({
    data: {
      userId,
      name: "Conexion principal",
      provider,
      model: legacyConfig?.model || profile.defaultModel || DEFAULT_AI_MODEL,
      baseUrl: legacyConfig?.baseUrl || profile.defaultBaseUrl,
      encryptedApiKey: legacyConfig?.encryptedApiKey || encryptSecret(""),
      requiresApiKey: legacyConfig?.requiresApiKey ?? profile.requiresApiKey,
      isDefault: true,
    },
  })) as ConnectionRecord;

  await aiClient.aiConversation.updateMany({
    where: {
      userId,
      connectionId: null,
    },
    data: {
      connectionId: created.id,
      provider: created.provider,
      model: created.model,
    },
  });

  return created;
}

export async function ensureUserConnections(userId: string): Promise<{
  connections: NormalizedAiConnection[];
  defaultConnectionId: string;
}> {
  const aiClient = getAiClient();
  let records = (await aiClient.userAiConnection.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  })) as ConnectionRecord[];

  if (records.length === 0) {
    const created = await createDefaultConnectionFromLegacy(userId);
    records = [created];
  }

  let defaultConnection = records.find((item) => item.isDefault) || records[0];

  if (!defaultConnection.isDefault) {
    await aiClient.userAiConnection.update({
      where: { id: defaultConnection.id },
      data: { isDefault: true },
    });
    defaultConnection = { ...defaultConnection, isDefault: true };
  }

  return {
    connections: records.map(normalizeConnection),
    defaultConnectionId: defaultConnection.id,
  };
}
