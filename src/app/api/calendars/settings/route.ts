import { getSessionUser } from "@/src/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";
import { Prisma } from "@prisma/client";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const settings = await prisma.userCalendarSettings.findUnique({
      where: { userId: actorUserId },
      select: {
        visibleCalendarIds: true,
        includeTaskLayer: true,
        includeProjectLayer: true,
      },
    });

    if (!settings) {
      return json({
        visibleCalendarIds: null,
        includeTaskLayer: true,
        includeProjectLayer: true,
      });
    }

    return json({
      visibleCalendarIds: asStringArray(settings.visibleCalendarIds),
      includeTaskLayer: settings.includeTaskLayer,
      includeProjectLayer: settings.includeProjectLayer,
    });
  } catch (error) {
    console.error("GET_CALENDAR_SETTINGS_ERROR", error);
    return serverError("No se pudieron cargar las preferencias");
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const body = (await req.json()) as {
      visibleCalendarIds?: unknown;
      includeTaskLayer?: unknown;
      includeProjectLayer?: unknown;
    };

    const visibleCalendarIds =
      body.visibleCalendarIds === null || body.visibleCalendarIds === undefined
        ? null
        : asStringArray(body.visibleCalendarIds);

    const normalizedVisibleCalendarIds =
      visibleCalendarIds === null ? Prisma.JsonNull : (visibleCalendarIds as Prisma.InputJsonValue);

    if (body.visibleCalendarIds !== undefined && body.visibleCalendarIds !== null && !Array.isArray(body.visibleCalendarIds)) {
      return badRequest("visibleCalendarIds invalido");
    }

    const includeTaskLayer = body.includeTaskLayer === undefined ? undefined : body.includeTaskLayer === true;
    const includeProjectLayer = body.includeProjectLayer === undefined ? undefined : body.includeProjectLayer === true;

    const saved = await prisma.userCalendarSettings.upsert({
      where: { userId: actorUserId },
      create: {
        userId: actorUserId,
        visibleCalendarIds: normalizedVisibleCalendarIds,
        includeTaskLayer: includeTaskLayer ?? true,
        includeProjectLayer: includeProjectLayer ?? true,
      },
      update: {
        ...(body.visibleCalendarIds !== undefined ? { visibleCalendarIds: normalizedVisibleCalendarIds } : {}),
        ...(includeTaskLayer !== undefined ? { includeTaskLayer } : {}),
        ...(includeProjectLayer !== undefined ? { includeProjectLayer } : {}),
      },
      select: {
        visibleCalendarIds: true,
        includeTaskLayer: true,
        includeProjectLayer: true,
      },
    });

    return json({
      visibleCalendarIds: asStringArray(saved.visibleCalendarIds),
      includeTaskLayer: saved.includeTaskLayer,
      includeProjectLayer: saved.includeProjectLayer,
    });
  } catch (error) {
    console.error("UPDATE_CALENDAR_SETTINGS_ERROR", error);
    return serverError("No se pudieron guardar las preferencias");
  }
}
