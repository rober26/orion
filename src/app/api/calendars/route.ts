import { AccessRole, CalendarVisibility } from "@prisma/client";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/src/lib/http";
import prisma from "@/src/lib/prisma";
import { ensureDefaultCalendar, calendarAccessWhere } from "@/src/lib/calendar-access";
import { resolveSessionUserId } from "@/src/lib/session-user";

const CALENDAR_NAME_MAX_LENGTH = 100;

function parseVisibility(value: unknown): CalendarVisibility | null {
  if (value === CalendarVisibility.PUBLIC || value === CalendarVisibility.PRIVATE) {
    return value;
  }

  return null;
}

function parseHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
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

    await ensureDefaultCalendar(actorUserId);

    const calendars = await prisma.calendar.findMany({
      where: calendarAccessWhere(actorUserId),
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        visibility: true,
        isDefault: true,
        ownerId: true,
        creatorId: true,
        users: {
          where: { userId: actorUserId },
          select: { role: true },
          take: 1,
        },
      },
    });

    return json(
      calendars.map((calendar) => {
        const role =
          calendar.ownerId === actorUserId || calendar.creatorId === actorUserId
            ? AccessRole.OWNER
            : (calendar.users[0]?.role ?? AccessRole.READER);

        return {
          id: calendar.id,
          name: calendar.name,
          color: calendar.color,
          visibility: calendar.visibility,
          isDefault: calendar.isDefault,
          role,
          source: role === AccessRole.OWNER ? "owned" : "shared",
        };
      }),
    );
  } catch (error) {
    console.error("GET_CALENDARS_ERROR", error);
    return serverError("No se pudieron cargar los calendarios");
  }
}

export async function POST(req: Request) {
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
      name?: unknown;
      color?: unknown;
      visibility?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const color = typeof body.color === "string" ? body.color.trim() : "";
    const visibility = parseVisibility(body.visibility) ?? CalendarVisibility.PRIVATE;

    if (!name) {
      return badRequest("Nombre obligatorio");
    }

    if (name.length > CALENDAR_NAME_MAX_LENGTH) {
      return badRequest("El nombre no puede superar 100 caracteres");
    }

    if (color && !parseHexColor(color)) {
      return badRequest("Color invalido");
    }

    const created = await prisma.calendar.create({
      data: {
        name,
        color: color || "#2563eb",
        visibility,
        ownerId: actorUserId,
        creatorId: actorUserId,
        users: {
          create: {
            userId: actorUserId,
            role: AccessRole.OWNER,
            invitedBy: actorUserId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
        visibility: true,
        isDefault: true,
      },
    });

    return json(
      {
        ...created,
        role: AccessRole.OWNER,
        source: "owned",
      },
      201,
    );
  } catch (error) {
    console.error("CREATE_CALENDAR_ERROR", error);
    return serverError("No se pudo crear el calendario");
  }
}
