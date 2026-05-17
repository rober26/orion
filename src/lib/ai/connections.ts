import { getAiClient } from "./client";
import { DEFAULT_AI_MODEL, LOCAL_ONLY_AI_PROVIDER, providerProfile } from "./constants";
import { encryptSecret } from "./crypto";

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

function normalizeConnection(record: ConnectionRecord): NormalizedAiConnection {
  return {
    id: record.id,
    name: record.name,
    provider: LOCAL_ONLY_AI_PROVIDER,
    model: record.model,
    baseUrl: record.baseUrl,
    requiresApiKey: false,
    hasApiKey: false,
    maskedApiKey: null,
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

  if (!legacyConfig) {
    throw new Error("No existe configuracion IA legacy para migrar");
  }

  const provider = LOCAL_ONLY_AI_PROVIDER;
  const profile = providerProfile(provider);

  const created = (await aiClient.userAiConnection.create({
    data: {
      userId,
      name: "Conexion principal",
      provider,
      model: legacyConfig.model || profile.defaultModel || DEFAULT_AI_MODEL,
      baseUrl: legacyConfig.baseUrl || profile.defaultBaseUrl,
      encryptedApiKey: encryptSecret(""),
      requiresApiKey: false,
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

export async function ensureUserConnections(
  userId: string,
  options: { createIfMissing?: boolean } = {},
): Promise<{
  connections: NormalizedAiConnection[];
  defaultConnectionId: string | null;
}> {
  const aiClient = getAiClient();
  const createIfMissing = options.createIfMissing === true;

  let records = (await aiClient.userAiConnection.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  })) as ConnectionRecord[];

  if (records.length === 0) {
    const hasLegacyConfig = Boolean(
      await aiClient.userAiConfig.findUnique({
        where: { userId },
        select: { id: true },
      }),
    );

    if (hasLegacyConfig) {
      const created = await createDefaultConnectionFromLegacy(userId);
      records = [created];
    } else if (!createIfMissing) {
      return {
        connections: [],
        defaultConnectionId: null,
      };
    }
  }

  if (records.length === 0) {
    return {
      connections: [],
      defaultConnectionId: null,
    };
  }

  const firstDefault = records.find((item) => item.isDefault) || records[0];
  const defaultCandidates = records.filter((item) => item.isDefault);
  const mustNormalizeDefault = defaultCandidates.length !== 1 || !firstDefault.isDefault;

  if (mustNormalizeDefault) {
    await aiClient.userAiConnection.updateMany({
      where: {
        userId,
        NOT: { id: firstDefault.id },
      },
      data: { isDefault: false },
    });

    await aiClient.userAiConnection.update({
      where: { id: firstDefault.id },
      data: { isDefault: true },
    });
  }

  const normalizedRecords = records.map((record) => ({
    ...record,
    isDefault: record.id === firstDefault.id,
  }));

  return {
    connections: normalizedRecords.map(normalizeConnection),
    defaultConnectionId: firstDefault.id,
  };
}
