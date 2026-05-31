import { AccessRole, ProjectRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, projectAccessWhere } from "@/src/lib/permissions";
import { calendarAccessWhere, canEditCalendarContent, ensureDefaultCalendar } from "@/src/lib/calendar-access";
import { buildProjectCalendarName, buildProjectCalendarPrefix } from "@/src/lib/project-calendar";
import { resolveSessionUserId } from "@/src/lib/session-user";
import { CALENDAR_ERROR_MESSAGE, invalidSessionResponse } from "@/src/lib/calendar/errors";

const EVENT_TITLE_MAX_LENGTH = 100;

function parseDateParam(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeDateRange(fromRaw: string | null, toRaw: string | null): { from: Date; to: Date } | null {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const defaultTo = new Date(now);
  defaultTo.setDate(defaultTo.getDate() + 60);

  const from = parseDateParam(fromRaw) ?? defaultFrom;
  const to = parseDateParam(toRaw) ?? defaultTo;

  if (to < from) {
    return null;
  }

  return { from, to };
}

function buildProjectPermissionMap(
  projects: Array<{ id: string; ownerId: string; creatorId: string; users: Array<{ role: ProjectRole }> }>,
  actorUserId: string,
): Set<string> {
  const editable = new Set<string>();

  for (const project of projects) {
    const projectRole = project.users[0]?.role;
    const canEdit =
      project.ownerId === actorUserId ||
      project.creatorId === actorUserId ||
      projectRole === ProjectRole.OWNER ||
      projectRole === ProjectRole.MEMBER;

    if (canEdit) {
      editable.add(project.id);
    }
  }

  return editable;
}

function parseProjectFilter(projectIdRaw: string | null): string | null {
  if (!projectIdRaw) {
    return null;
  }

  const value = projectIdRaw.trim();
  return value || null;
}

function parseCalendarFilter(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFlag(value: string | null, fallback = true): boolean {
  if (value === null) {
    return fallback;
  }

  return value === "true";
}

function parseBoolean(value: unknown): boolean {
  return value === true;
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

async function ensureProjectCalendarForEvent(projectId: string, actorUserId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      color: true,
      ownerId: true,
    },
  });

  if (!project) {
    return null;
  }

  const prefix = buildProjectCalendarPrefix(project.id);
  const existing = await prisma.calendar.findFirst({
    where: {
      ownerId: project.ownerId,
      name: { startsWith: prefix },
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.calendar.create({
    data: {
      name: buildProjectCalendarName(project.id, project.name),
      color: project.color || "#2563eb",
      visibility: "PRIVATE",
      ownerId: project.ownerId,
      creatorId: actorUserId,
      users: {
        create: {
          userId: project.ownerId,
          role: AccessRole.OWNER,
          invitedBy: actorUserId,
        },
      },
    },
    select: { id: true },
  });

  return created.id;
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return invalidSessionResponse();
    }

    const { searchParams } = new URL(req.url);
    const normalized = normalizeDateRange(searchParams.get("from"), searchParams.get("to"));
    const projectFilter = parseProjectFilter(searchParams.get("projectId"));
    const calendarFilter = parseCalendarFilter(searchParams.get("calendarIds"));
    const includeTasks = parseFlag(searchParams.get("includeTasks"), true);
    const includeProjects = parseFlag(searchParams.get("includeProjects"), true);
    if (!normalized) {
      return badRequest(CALENDAR_ERROR_MESSAGE.invalidRange);
    }

    const { from, to } = normalized;

    let calendarFeaturesAvailable = true;
    try {
      await ensureDefaultCalendar(actorUserId);
    } catch (error) {
      if (isMissingCalendarSchemaError(error)) {
        calendarFeaturesAvailable = false;
      } else {
        throw error;
      }
    }

    const projects = await prisma.project.findMany({
      where: {
        ...projectAccessWhere(actorUserId),
      },
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
        creatorId: true,
        createdAt: true,
        users: {
          where: { userId: actorUserId },
          select: { role: true },
          take: 1,
        },
      },
    });

    const projectIds = projects.map((project) => project.id);
    const selectedProjectIds = projectFilter ? projectIds.filter((projectId) => projectId === projectFilter) : projectIds;
    const editableProjectIds = buildProjectPermissionMap(projects, actorUserId);

    let selectedCalendarIds: string[] = [];
    const editableCalendarIds = new Set<string>();

    if (calendarFeaturesAvailable) {
      try {
        const calendars = await prisma.calendar.findMany({
          where: calendarAccessWhere(actorUserId),
          select: {
            id: true,
            name: true,
            color: true,
            ownerId: true,
            creatorId: true,
            users: {
              where: { userId: actorUserId },
              select: { role: true },
              take: 1,
            },
          },
        });

        const calendarIds = calendars.map((calendar) => calendar.id);
        selectedCalendarIds = calendarFilter.length > 0 ? calendarIds.filter((id) => calendarFilter.includes(id)) : calendarIds;

        for (const calendar of calendars) {
          const role = calendar.users[0]?.role;
          const canEdit =
            calendar.ownerId === actorUserId ||
            calendar.creatorId === actorUserId ||
            role === AccessRole.OWNER ||
            role === AccessRole.EDITOR;

          if (canEdit) {
            editableCalendarIds.add(calendar.id);
          }
        }
      } catch (error) {
        if (isMissingCalendarSchemaError(error)) {
          calendarFeaturesAvailable = false;
          selectedCalendarIds = [];
        } else {
          throw error;
        }
      }
    }

    if (selectedProjectIds.length === 0 && selectedCalendarIds.length === 0) {
      return json([]);
    }

    const tasks = includeTasks
      ? await prisma.task.findMany({
          where: {
            projectId: { in: selectedProjectIds },
            dueDate: {
              not: null,
              gte: from,
              lte: to,
            },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            projectId: true,
            project: { select: { name: true, color: true } },
          },
        })
      : [];

    const events = calendarFeaturesAvailable
      ? await prisma.event.findMany({
          where: {
            OR: [{ calendarId: { in: selectedCalendarIds } }, { projectId: { in: selectedProjectIds } }],
            startDate: { lte: to },
            endDate: { gte: from },
          },
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startDate: true,
            endDate: true,
            isAllDay: true,
            projectId: true,
            calendarId: true,
            project: { select: { name: true, color: true } },
            calendar: { select: { name: true, color: true } },
          },
        })
      : await prisma.event.findMany({
          where: {
            projectId: { in: selectedProjectIds },
            startDate: { lte: to },
            endDate: { gte: from },
          },
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startDate: true,
            endDate: true,
            isAllDay: true,
            projectId: true,
            project: { select: { name: true, color: true } },
          },
        });

    const mergedEvents = [
      ...events.map((event) => {
        const eventWithCalendar = event as {
          calendarId?: string | null;
          calendar?: { name: string; color: string | null } | null;
        };
        const eventCalendarId = eventWithCalendar.calendarId ?? null;
        const eventCalendar = eventWithCalendar.calendar ?? null;
        const canEditByProject = event.projectId ? editableProjectIds.has(event.projectId) : false;
        const canEditByCalendar = eventCalendarId ? editableCalendarIds.has(eventCalendarId) : false;

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          start: event.startDate,
          end: event.endDate,
          allDay: event.isAllDay,
          sourceType: "event" as const,
          projectId: event.projectId,
          projectName: event.project?.name ?? null,
          calendarId: eventCalendarId ?? null,
          calendarName: eventCalendar?.name ?? null,
          color: eventCalendar?.color ?? event.project?.color ?? null,
          isReadOnly: !(canEditByProject || canEditByCalendar),
          canReschedule: canEditByProject || canEditByCalendar,
        };
      }),
      ...tasks.flatMap((task) => {
        if (!task.dueDate) {
          return [];
        }

        return [
          {
            id: task.id,
            title: task.title,
            description: null,
            location: null,
            start: task.dueDate,
            end: task.dueDate,
            allDay: true,
            sourceType: "task" as const,
            projectId: task.projectId,
            projectName: task.project.name,
            calendarId: null,
            calendarName: null,
            color: task.project.color,
            isReadOnly: !editableProjectIds.has(task.projectId),
            canReschedule: editableProjectIds.has(task.projectId),
          },
        ];
      }),
      ...(includeProjects
        ? projects
            .filter(
              (project) =>
                selectedProjectIds.includes(project.id) && project.createdAt >= from && project.createdAt <= to,
            )
            .map((project) => ({
              id: project.id,
              title: project.name,
              description: null,
              location: null,
              start: project.createdAt,
              end: project.createdAt,
              allDay: true,
              sourceType: "project" as const,
              projectId: project.id,
              projectName: project.name,
              calendarId: null,
              calendarName: null,
              color: project.color,
              isReadOnly: true,
              canReschedule: false,
            }))
        : []),
    ];

    mergedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return json(mergedEvents);
  } catch (error) {
    console.error("GET_CALENDAR_EVENTS_ERROR", error);
    return serverError("Error al cargar eventos");
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
      return invalidSessionResponse();
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      location?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      isAllDay?: unknown;
      projectId?: unknown;
      calendarId?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    const calendarId = typeof body.calendarId === "string" ? body.calendarId.trim() : "";

    if (!title) {
      return badRequest("Titulo obligatorio");
    }

    if (title.length > EVENT_TITLE_MAX_LENGTH) {
      return badRequest("El titulo no puede superar 100 caracteres");
    }

    if (!projectId && !calendarId) {
      return badRequest(CALENDAR_ERROR_MESSAGE.missingOwnerReference);
    }

    const startDate = typeof body.startDate === "string" ? new Date(body.startDate) : null;
    const endDate = typeof body.endDate === "string" ? new Date(body.endDate) : null;

    if (!startDate || Number.isNaN(startDate.getTime()) || !endDate || Number.isNaN(endDate.getTime())) {
      return badRequest(CALENDAR_ERROR_MESSAGE.invalidDates);
    }

    if (endDate < startDate) {
      return badRequest(CALENDAR_ERROR_MESSAGE.endBeforeStart);
    }

    let resolvedProjectId: string | null = projectId || null;
    let resolvedCalendarId: string | null = calendarId || null;

    if (projectId) {
      if (!(await canEditProjectContent(projectId, actorUserId))) {
        return forbidden();
      }

      try {
        resolvedCalendarId = await ensureProjectCalendarForEvent(projectId, actorUserId);
      } catch (error) {
        if (isMissingCalendarSchemaError(error)) {
          resolvedCalendarId = null;
        } else {
          throw error;
        }
      }
    } else if (calendarId) {
      try {
        if (!(await canEditCalendarContent(calendarId, actorUserId))) {
          return forbidden();
        }
      } catch (error) {
        if (isMissingCalendarSchemaError(error)) {
          return badRequest("Los calendarios no estan disponibles en esta instalacion");
        }

        throw error;
      }
    }

    const created = await prisma.event.create({
      data: {
        title,
        description: description || null,
        location: location || null,
        startDate,
        endDate,
        isAllDay: parseBoolean(body.isAllDay),
        projectId: resolvedProjectId,
        calendarId: resolvedCalendarId,
        creatorId: actorUserId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        isAllDay: true,
        projectId: true,
        calendarId: true,
        project: { select: { name: true, color: true } },
        calendar: { select: { name: true, color: true } },
      },
    });

    return json(
      {
        id: created.id,
        title: created.title,
        description: created.description,
        location: created.location,
        start: created.startDate,
        end: created.endDate,
        allDay: created.isAllDay,
        sourceType: "event",
        projectId: created.projectId,
        projectName: created.project?.name ?? null,
        calendarId: created.calendarId,
        calendarName: created.calendar?.name ?? null,
        color: created.calendar?.color ?? created.project?.color ?? null,
        isReadOnly: false,
        canReschedule: true,
      },
      201,
    );
  } catch (error) {
    console.error("CREATE_CALENDAR_EVENT_ERROR", error);
    return serverError("No se pudo crear el evento");
  }
}
