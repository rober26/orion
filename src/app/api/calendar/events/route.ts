import { ProjectRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { canEditProjectContent, projectAccessWhere } from "@/src/lib/permissions";
import { resolveSessionUserId } from "@/src/lib/session-user";

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

function parseBoolean(value: unknown): boolean {
  return value === true;
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const { searchParams } = new URL(req.url);
    const normalized = normalizeDateRange(searchParams.get("from"), searchParams.get("to"));
    const projectFilter = parseProjectFilter(searchParams.get("projectId"));
    if (!normalized) {
      return badRequest("Rango de fechas invalido");
    }

    const { from, to } = normalized;

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

    if (selectedProjectIds.length === 0) {
      return json([]);
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: selectedProjectIds },
        dueDate: {
          not: null,
          gte: from,
          lte: to,
        },
      },
      select: { id: true, title: true, dueDate: true, projectId: true, project: { select: { name: true, color: true } } },
    });

    const events = await prisma.event.findMany({
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
      ...events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.startDate,
        end: event.endDate,
        allDay: event.isAllDay,
        sourceType: "event" as const,
        projectId: event.projectId,
        projectName: event.project.name,
        color: event.project.color,
        isReadOnly: !editableProjectIds.has(event.projectId),
        canReschedule: editableProjectIds.has(event.projectId),
      })),
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
            color: task.project.color,
            isReadOnly: !editableProjectIds.has(task.projectId),
            canReschedule: editableProjectIds.has(task.projectId),
          },
        ];
      }),
      ...projects
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
          color: project.color,
          isReadOnly: true,
          canReschedule: false,
        })),
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
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      location?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      isAllDay?: unknown;
      projectId?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";

    if (!title) {
      return badRequest("Titulo obligatorio");
    }

    if (title.length > EVENT_TITLE_MAX_LENGTH) {
      return badRequest("El titulo no puede superar 100 caracteres");
    }

    if (!projectId) {
      return badRequest("projectId obligatorio");
    }

    const startDate = typeof body.startDate === "string" ? new Date(body.startDate) : null;
    const endDate = typeof body.endDate === "string" ? new Date(body.endDate) : null;

    if (!startDate || Number.isNaN(startDate.getTime()) || !endDate || Number.isNaN(endDate.getTime())) {
      return badRequest("Fechas invalidas");
    }

    if (endDate < startDate) {
      return badRequest("La fecha de fin no puede ser menor a la de inicio");
    }

    if (!(await canEditProjectContent(projectId, actorUserId))) {
      return forbidden();
    }

    const created = await prisma.event.create({
      data: {
        title,
        description: description || null,
        location: location || null,
        startDate,
        endDate,
        isAllDay: parseBoolean(body.isAllDay),
        projectId,
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
        project: { select: { name: true, color: true } },
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
        projectName: created.project.name,
        color: created.project.color,
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
