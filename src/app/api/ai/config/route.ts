import { badRequest, json, serverError, unauthorized } from "../../../../lib/http";
import { encryptSecret, readStoredSecret } from "../../../../lib/ai/crypto";
import {
  AI_PROVIDER_PROFILES,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  isAiProvider,
  providerProfile,
} from "../../../../lib/ai/constants";
import { resolveAiActorUserId } from "../../../../lib/ai/auth";
import { getAiClient } from "../../../../lib/ai/client";
import { ensureUserConnections } from "../../../../lib/ai/connections";

type UpdateConfigPayload = {
  connectionId?: unknown;
  connectionName?: unknown;
  createNew?: unknown;
  makeDefault?: unknown;
  provider?: unknown;
  model?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
  isActive?: unknown;
  requiresApiKey?: unknown;
};

type ConfigRecord = {
  provider: string;
  model: string;
  baseUrl: string | null;
  isActive: boolean;
  encryptedApiKey: string;
  requiresApiKey: boolean;
  updatedAt: Date;
};

type CurrentConfigRecord = {
  provider: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  requiresApiKey: boolean;
};

type ExistingConnectionRecord = {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  requiresApiKey: boolean;
  isDefault: boolean;
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function maskApiKey(secret: string): string {
  if (secret.length <= 8) {
    return "********";
  }

  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export async function GET() {
  try {
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const aiClient = getAiClient();
    const config = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        provider: true,
        model: true,
        baseUrl: true,
        isActive: true,
        requiresApiKey: true,
        encryptedApiKey: true,
        updatedAt: true,
      },
    })) as ConfigRecord | null;

    const safeProvider = isAiProvider(config?.provider) ? config.provider : DEFAULT_AI_PROVIDER;
    const { connections, defaultConnectionId } = await ensureUserConnections(actorUserId);

    if (!config) {
      return json({
        provider: DEFAULT_AI_PROVIDER,
        model: DEFAULT_AI_MODEL,
        baseUrl: null,
        isActive: true,
        requiresApiKey: true,
        hasApiKey: false,
        maskedApiKey: null,
        updatedAt: null,
        providerOptions: Object.values(AI_PROVIDER_PROFILES),
        connections,
        defaultConnectionId,
      });
    }

    const decryptedApiKey = readStoredSecret(config.encryptedApiKey);

    return json({
      provider: safeProvider,
      model: config.model,
      baseUrl: config.baseUrl,
      isActive: config.isActive,
      requiresApiKey: config.requiresApiKey,
      hasApiKey: decryptedApiKey.length > 0,
      maskedApiKey: decryptedApiKey.length > 0 ? maskApiKey(decryptedApiKey) : null,
      updatedAt: config.updatedAt.toISOString(),
      providerOptions: Object.values(AI_PROVIDER_PROFILES),
      connections,
      defaultConnectionId,
    });
  } catch (error) {
    console.error("GET_AI_CONFIG_ERROR", error);
    return serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    await ensureUserConnections(actorUserId);

    const body = (await request.json()) as UpdateConfigPayload;

    const connectionId = typeof body.connectionId === "string" ? body.connectionId : undefined;
    const connectionName =
      typeof body.connectionName === "string" && body.connectionName.trim().length > 0
        ? body.connectionName.trim().slice(0, 80)
        : undefined;
    const createNew = body.createNew === true;
    const makeDefault = body.makeDefault === true;

    const providerInput = body.provider;
    const provider = isAiProvider(providerInput) ? providerInput : undefined;
    const model = typeof body.model === "string" ? body.model.trim() : undefined;
    const baseUrlInput = typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
    const requiresApiKey = typeof body.requiresApiKey === "boolean" ? body.requiresApiKey : undefined;

    if (providerInput !== undefined && !provider) {
      return badRequest("Proveedor IA invalido");
    }

    if (model !== undefined && (model.length < 2 || model.length > 100)) {
      return badRequest("Modelo invalido");
    }

    if (baseUrlInput !== undefined && baseUrlInput.length > 0 && !isValidHttpUrl(baseUrlInput)) {
      return badRequest("Base URL invalida");
    }

    if (apiKey !== undefined && apiKey.length > 0 && apiKey.length < 4) {
      return badRequest("API key invalida");
    }

    const currentConfig = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        provider: true,
        model: true,
        baseUrl: true,
        encryptedApiKey: true,
        requiresApiKey: true,
      },
    })) as CurrentConfigRecord | null;

    const targetConnection = connectionId
      ? ((await aiClient.userAiConnection.findFirst({
          where: {
            id: connectionId,
            userId: actorUserId,
          },
          select: {
            id: true,
            name: true,
            provider: true,
            model: true,
            baseUrl: true,
            encryptedApiKey: true,
            requiresApiKey: true,
            isDefault: true,
          },
        })) as ExistingConnectionRecord | null)
      : null;

    const nextProvider = provider ?? (isAiProvider(targetConnection?.provider) ? targetConnection.provider : DEFAULT_AI_PROVIDER);
    const nextProviderProfile = providerProfile(nextProvider);
    const providerChanged = provider !== undefined && provider !== targetConnection?.provider;
    const nextModel = model ?? (providerChanged ? nextProviderProfile.defaultModel : (targetConnection?.model ?? currentConfig?.model ?? nextProviderProfile.defaultModel));
    const nextBaseUrl =
      baseUrlInput === undefined
        ? providerChanged
          ? nextProviderProfile.defaultBaseUrl
          : (targetConnection?.baseUrl ?? currentConfig?.baseUrl ?? nextProviderProfile.defaultBaseUrl)
        : baseUrlInput || nextProviderProfile.defaultBaseUrl;

    const nextRequiresApiKey = requiresApiKey ?? targetConnection?.requiresApiKey ?? currentConfig?.requiresApiKey ?? nextProviderProfile.requiresApiKey;

    if (nextRequiresApiKey && !targetConnection && !currentConfig && (!apiKey || apiKey.length === 0)) {
      return badRequest("Debes ingresar una API key para activar el chat");
    }

    const encryptedApiKey =
      apiKey !== undefined
        ? encryptSecret(apiKey)
        : (targetConnection?.encryptedApiKey ?? currentConfig?.encryptedApiKey ?? encryptSecret(""));

    let savedConnectionId = targetConnection?.id;

    if (createNew || !targetConnection) {
      const newConnection = (await aiClient.userAiConnection.create({
        data: {
          userId: actorUserId,
          name: connectionName || `Conexion ${new Date().toLocaleDateString()}`,
          provider: nextProvider,
          model: nextModel,
          baseUrl: nextBaseUrl,
          encryptedApiKey,
          requiresApiKey: nextRequiresApiKey,
          isDefault: false,
        },
        select: { id: true },
      })) as { id: string };

      savedConnectionId = newConnection.id;
    } else {
      await aiClient.userAiConnection.update({
        where: { id: targetConnection.id },
        data: {
          name: connectionName || targetConnection.name,
          provider: nextProvider,
          model: nextModel,
          baseUrl: nextBaseUrl,
          encryptedApiKey,
          requiresApiKey: nextRequiresApiKey,
        },
      });
    }

    if (makeDefault && savedConnectionId) {
      await aiClient.userAiConnection.updateMany({
        where: {
          userId: actorUserId,
          NOT: { id: savedConnectionId },
        },
        data: { isDefault: false },
      });

      await aiClient.userAiConnection.update({
        where: { id: savedConnectionId },
        data: { isDefault: true },
      });
    }

    const { connections, defaultConnectionId } = await ensureUserConnections(actorUserId);
    const defaultConnection = connections.find((item) => item.id === defaultConnectionId) || connections[0];

    if (!defaultConnection) {
      return serverError("No se pudo resolver la conexion IA predeterminada");
    }

    const nextConfig = (await aiClient.userAiConfig.upsert({
      where: { userId: actorUserId },
      update: {
        provider: defaultConnection.provider,
        model: defaultConnection.model,
        baseUrl: defaultConnection.baseUrl,
        encryptedApiKey: encryptedApiKey,
        isActive: true,
        requiresApiKey: defaultConnection.requiresApiKey,
      },
      create: {
        userId: actorUserId,
        provider: defaultConnection.provider,
        model: defaultConnection.model,
        baseUrl: defaultConnection.baseUrl,
        encryptedApiKey: encryptedApiKey,
        isActive: true,
        requiresApiKey: defaultConnection.requiresApiKey,
      },
      select: {
        provider: true,
        model: true,
        baseUrl: true,
        isActive: true,
        requiresApiKey: true,
        encryptedApiKey: true,
        updatedAt: true,
      },
    })) as ConfigRecord;

    const decryptedApiKey = readStoredSecret(nextConfig.encryptedApiKey);

    return json({
      provider: nextConfig.provider,
      model: nextConfig.model,
      baseUrl: nextConfig.baseUrl,
      isActive: nextConfig.isActive,
      requiresApiKey: nextConfig.requiresApiKey,
      hasApiKey: decryptedApiKey.length > 0,
      maskedApiKey: decryptedApiKey.length > 0 ? maskApiKey(decryptedApiKey) : null,
      updatedAt: nextConfig.updatedAt.toISOString(),
      providerOptions: Object.values(AI_PROVIDER_PROFILES),
      connections,
      defaultConnectionId,
      lastSavedConnectionId: savedConnectionId ?? defaultConnectionId,
    });
  } catch (error) {
    console.error("PATCH_AI_CONFIG_ERROR", error);
    return serverError();
  }
}
