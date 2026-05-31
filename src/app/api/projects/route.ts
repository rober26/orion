import { AccessRole, CalendarVisibility } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser, type SessionUser } from "@/src/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/src/lib/http";
import { projectAccessWhere } from "@/src/lib/permissions";
import { buildProjectCalendarName } from "@/src/lib/project-calendar";
import { getInvalidSessionMessage } from "@/src/lib/validation/auth";

const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_STATUSES = ["active", "archived", "all"] as const;

type ProjectStatus = (typeof PROJECT_STATUSES)[number];

function parseGroupIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

async function resolveSessionUserId(sessionUser: SessionUser): Promise<string | null> {
  const userById = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: { id: true },
  });

  if (userById) {
    return userById.id;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: sessionUser.email },
    select: { id: true },
  });

  return userByEmail?.id ?? null;
}

function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function isMissingCalendarSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  if (code !== "P2021" && code !== "P2022") {
    return false;
  }

  const meta = (error as { meta?: unknown }).meta;
  const metaText = typeof meta === "object" && meta !== null ? JSON.stringify(meta).toLowerCase() : "";
  return metaText.includes("calendar");
}

// Obtener todos los proyectos del usuario
export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized(getInvalidSessionMessage());
    }

    const { searchParams } = new URL(req.url);
    const requestedStatus = searchParams.get("status");
    const status: ProjectStatus = PROJECT_STATUSES.includes(requestedStatus as ProjectStatus)
      ? (requestedStatus as ProjectStatus)
      : "active";

    const archivedFilter =
      status === "all"
        ? {}
        : {
            isArchived: status === "archived",
          };

    const projects = await prisma.project.findMany({
      where: {
        ...projectAccessWhere(actorUserId),
        ...archivedFilter,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { tasks: true, users: true },
        },
      },
    });
    return json(projects);
  } catch {
    return serverError("Error al obtener proyectos");
  }
}

// Crear un nuevo proyecto
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized(getInvalidSessionMessage());
    }

    const body = await req.json();
    const rawName = typeof body?.name === "string" ? body.name : "";
    const rawDescription = typeof body?.description === "string" ? body.description : "";
    const rawColor = typeof body?.color === "string" ? body.color.trim() : "";
    const legacyGroupId = typeof body?.groupId === "string" ? body.groupId.trim() : "";
    const groupIds = parseGroupIds(body?.groupIds);
    const normalizedGroupIds = legacyGroupId ? Array.from(new Set([legacyGroupId, ...groupIds])) : groupIds;
    const name = rawName.trim();
    const description = rawDescription.trim();

    if (!name) {
      return badRequest("Nombre requerido");
    }

    if (name.length > PROJECT_NAME_MAX_LENGTH) {
      return badRequest("El nombre no puede superar 100 caracteres");
    }

    if (rawColor && !isValidHexColor(rawColor)) {
      return badRequest("Color invalido");
    }

    if (normalizedGroupIds.length > 0) {
      const allowedGroups = await prisma.group.findMany({
        where: {
          id: { in: normalizedGroupIds },
          OR: [{ ownerId: actorUserId }, { members: { some: { userId: actorUserId } } }],
        },
        select: { id: true },
      });

      if (allowedGroups.length !== normalizedGroupIds.length) {
        return badRequest("No tienes acceso al equipo seleccionado");
      }
    }

    const newProject = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name,
          description: description || "Nuevo proyecto",
          color: rawColor || "#3b82f6",
          creatorId: actorUserId,
          ownerId: actorUserId,
        },
      });

      try {
        await tx.calendar.create({
          data: {
            name: buildProjectCalendarName(created.id, created.name),
            color: created.color,
            visibility: CalendarVisibility.PRIVATE,
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
        });
      } catch (calendarError) {
        if (!isMissingCalendarSchemaError(calendarError)) {
          throw calendarError;
        }
      }

      if (normalizedGroupIds.length > 0) {
        await tx.projectGroup.createMany({
          data: normalizedGroupIds.map((groupId) => ({
            projectId: created.id,
            groupId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.project.findUnique({
        where: { id: created.id },
        include: {
          groups: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return json(newProject, 201);
  } catch (error: unknown) {
    console.error("ERROR CREAR PROYECTO:", error);
    return serverError("Error al crear proyecto");
  }
}
