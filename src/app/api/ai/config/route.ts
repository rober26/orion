import { badRequest, json, serverError, unauthorized } from "../../../../lib/http";
import { encryptSecret } from "../../../../lib/ai/crypto";
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, LOCAL_AI_PROVIDER_OPTIONS, LOCAL_ONLY_AI_PROVIDER, providerProfile } from "../../../../lib/ai/constants";
import { resolveAiActorUserId } from "../../../../lib/ai/auth";
import { getSessionUser } from "../../../../lib/auth";
import { getAiClient } from "../../../../lib/ai/client";
import { ensureUserConnections } from "../../../../lib/ai/connections";
import { assertSafeAiBaseUrl } from "../../../../lib/ai/base-url";
import prisma from "../../../../lib/prisma";

type UpdateConfigPayload = {
  connectionId?: unknown;
  connectionName?: unknown;
  createNew?: unknown;
  makeDefault?: unknown;
  provider?: unknown;
  model?: unknown;
  baseUrl?: unknown;
  preferredLanguage?: unknown;
  preferredName?: unknown;
  isActive?: unknown;
};

type ConfigRecord = {
  provider: string;
  model: string;
  baseUrl: string | null;
  preferredLanguage: string;
  preferredName: string | null;
  isActive: boolean;
  updatedAt: Date;
};

type CurrentConfigRecord = {
  model: string;
  baseUrl: string | null;
  preferredLanguage: string;
  preferredName: string | null;
};

type ExistingConnectionRecord = {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  isDefault: boolean;
};

export async function GET() {
  try {
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const aiClient = getAiClient();
    const sessionUser = await getSessionUser();
    const dbUser = sessionUser
      ? await prisma.user.findUnique({
          where: { id: sessionUser.userId },
          select: { username: true },
        })
      : null;
    const config = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        provider: true,
        model: true,
        baseUrl: true,
        preferredLanguage: true,
        preferredName: true,
        isActive: true,
        updatedAt: true,
      },
    })) as ConfigRecord | null;

    const { connections, defaultConnectionId } = await ensureUserConnections(actorUserId, { createIfMissing: false });

    if (!config) {
      return json({
        provider: DEFAULT_AI_PROVIDER,
        model: DEFAULT_AI_MODEL,
        baseUrl: null,
        preferredLanguage: "es",
        preferredName: dbUser?.username || "Usuario",
        isActive: true,
        requiresApiKey: false,
        hasApiKey: false,
        maskedApiKey: null,
        updatedAt: null,
        providerOptions: LOCAL_AI_PROVIDER_OPTIONS,
        connections,
        defaultConnectionId,
      });
    }

    return json({
      provider: LOCAL_ONLY_AI_PROVIDER,
      model: config.model,
      baseUrl: config.baseUrl,
      preferredLanguage: config.preferredLanguage,
      preferredName: config.preferredName || dbUser?.username || "Usuario",
      isActive: config.isActive,
      requiresApiKey: false,
      hasApiKey: false,
      maskedApiKey: null,
      updatedAt: config.updatedAt.toISOString(),
      providerOptions: LOCAL_AI_PROVIDER_OPTIONS,
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

    const body = (await request.json()) as UpdateConfigPayload;

    const connectionId = typeof body.connectionId === "string" ? body.connectionId : undefined;
    const connectionName =
      typeof body.connectionName === "string" && body.connectionName.trim().length > 0
        ? body.connectionName.trim().slice(0, 80)
        : undefined;
    const createNew = body.createNew === true;
    const makeDefault = body.makeDefault === true;

    const providerInput = body.provider;
    const provider = LOCAL_ONLY_AI_PROVIDER;
    const model = typeof body.model === "string" ? body.model.trim() : undefined;
    const baseUrlInput = typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined;
    const preferredLanguageInput = typeof body.preferredLanguage === "string" ? body.preferredLanguage.trim() : undefined;
    const preferredNameInput = typeof body.preferredName === "string" ? body.preferredName.trim() : undefined;

    if (providerInput !== undefined && providerInput !== LOCAL_ONLY_AI_PROVIDER) {
      return badRequest("Solo se permiten conexiones IA locales");
    }

    if (model !== undefined && (model.length < 2 || model.length > 100)) {
      return badRequest("Modelo invalido");
    }

    if (preferredLanguageInput !== undefined && (preferredLanguageInput.length < 2 || preferredLanguageInput.length > 12)) {
      return badRequest("Idioma preferido invalido");
    }

    if (preferredNameInput !== undefined && preferredNameInput.length > 80) {
      return badRequest("Nombre preferido invalido");
    }

    const sessionUser = await getSessionUser();
    const dbUser = sessionUser
      ? await prisma.user.findUnique({
          where: { id: sessionUser.userId },
          select: { username: true },
        })
      : null;

    const currentConfig = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        model: true,
        baseUrl: true,
        preferredLanguage: true,
        preferredName: true,
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
            isDefault: true,
          },
        })) as ExistingConnectionRecord | null)
      : null;

    const nextProvider = provider;
    const nextProviderProfile = providerProfile(nextProvider);
    const providerChanged = targetConnection?.provider !== nextProvider;
    const nextModel = model ?? (providerChanged ? nextProviderProfile.defaultModel : (targetConnection?.model ?? currentConfig?.model ?? nextProviderProfile.defaultModel));
    const nextBaseUrl =
      baseUrlInput === undefined
        ? providerChanged
          ? nextProviderProfile.defaultBaseUrl
          : (targetConnection?.baseUrl ?? currentConfig?.baseUrl ?? nextProviderProfile.defaultBaseUrl)
        : baseUrlInput || nextProviderProfile.defaultBaseUrl;

    try {
      assertSafeAiBaseUrl(nextBaseUrl, nextProvider);
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : "Base URL invalida");
    }

    const nextRequiresApiKey = false;
    const encryptedApiKey = encryptSecret("");
    const nextPreferredLanguage = preferredLanguageInput || currentConfig?.preferredLanguage || "es";
    const nextPreferredName = (preferredNameInput || currentConfig?.preferredName || dbUser?.username || "Usuario").slice(0, 80);

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

    const { connections, defaultConnectionId } = await ensureUserConnections(actorUserId, { createIfMissing: false });
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
        preferredLanguage: nextPreferredLanguage,
        preferredName: nextPreferredName,
        encryptedApiKey: encryptedApiKey,
        isActive: true,
        requiresApiKey: defaultConnection.requiresApiKey,
      },
      create: {
        userId: actorUserId,
        provider: defaultConnection.provider,
        model: defaultConnection.model,
        baseUrl: defaultConnection.baseUrl,
        preferredLanguage: nextPreferredLanguage,
        preferredName: nextPreferredName,
        encryptedApiKey: encryptedApiKey,
        isActive: true,
        requiresApiKey: defaultConnection.requiresApiKey,
      },
      select: {
        provider: true,
        model: true,
        baseUrl: true,
        preferredLanguage: true,
        preferredName: true,
        isActive: true,
        requiresApiKey: true,
        updatedAt: true,
      },
    })) as ConfigRecord;

    return json({
      provider: nextConfig.provider,
      model: nextConfig.model,
      baseUrl: nextConfig.baseUrl,
      preferredLanguage: nextConfig.preferredLanguage,
      preferredName: nextConfig.preferredName || dbUser?.username || "Usuario",
      isActive: nextConfig.isActive,
      requiresApiKey: false,
      hasApiKey: false,
      maskedApiKey: null,
      updatedAt: nextConfig.updatedAt.toISOString(),
      providerOptions: LOCAL_AI_PROVIDER_OPTIONS,
      connections,
      defaultConnectionId,
      lastSavedConnectionId: savedConnectionId ?? defaultConnectionId,
    });
  } catch (error) {
    console.error("PATCH_AI_CONFIG_ERROR", error);
    return serverError();
  }
}

export async function DELETE(request: Request) {
  try {
    const aiClient = getAiClient();
    const actorUserId = await resolveAiActorUserId();

    if (!actorUserId) {
      return unauthorized();
    }

    const body = (await request.json()) as { connectionId?: unknown };
    const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";

    if (!connectionId) {
      return badRequest("Debes indicar una conexion valida");
    }

    const targetConnection = (await aiClient.userAiConnection.findFirst({
      where: {
        id: connectionId,
        userId: actorUserId,
      },
      select: {
        id: true,
      },
    })) as { id: string } | null;

    if (!targetConnection) {
      return badRequest("Conexion IA no encontrada");
    }

    await aiClient.userAiConnection.delete({
      where: { id: targetConnection.id },
    });

    const { connections, defaultConnectionId } = await ensureUserConnections(actorUserId, { createIfMissing: false });
    const nextDefault = connections.find((item) => item.id === defaultConnectionId) || connections[0] || null;

    if (nextDefault) {
      await aiClient.userAiConfig.upsert({
        where: { userId: actorUserId },
        update: {
          provider: nextDefault.provider,
          model: nextDefault.model,
          baseUrl: nextDefault.baseUrl,
          requiresApiKey: false,
          encryptedApiKey: encryptSecret(""),
          isActive: true,
        },
        create: {
          userId: actorUserId,
          provider: nextDefault.provider,
          model: nextDefault.model,
          baseUrl: nextDefault.baseUrl,
          preferredLanguage: "es",
          preferredName: "Usuario",
          requiresApiKey: false,
          encryptedApiKey: encryptSecret(""),
          isActive: true,
        },
      });
    }

    const sessionUser = await getSessionUser();
    const dbUser = sessionUser
      ? await prisma.user.findUnique({
          where: { id: sessionUser.userId },
          select: { username: true },
        })
      : null;
    const userConfig = (await aiClient.userAiConfig.findUnique({
      where: { userId: actorUserId },
      select: {
        provider: true,
        model: true,
        baseUrl: true,
        preferredLanguage: true,
        preferredName: true,
        isActive: true,
        updatedAt: true,
      },
    })) as ConfigRecord | null;

    return json({
      provider: userConfig?.provider || DEFAULT_AI_PROVIDER,
      model: userConfig?.model || DEFAULT_AI_MODEL,
      baseUrl: userConfig?.baseUrl || null,
      preferredLanguage: userConfig?.preferredLanguage || "es",
      preferredName: userConfig?.preferredName || dbUser?.username || "Usuario",
      isActive: userConfig?.isActive ?? true,
      requiresApiKey: false,
      hasApiKey: false,
      maskedApiKey: null,
      updatedAt: userConfig?.updatedAt?.toISOString() || null,
      providerOptions: LOCAL_AI_PROVIDER_OPTIONS,
      connections,
      defaultConnectionId,
      lastSavedConnectionId: defaultConnectionId,
    });
  } catch (error) {
    console.error("DELETE_AI_CONFIG_CONNECTION_ERROR", error);
    return serverError();
  }
}
