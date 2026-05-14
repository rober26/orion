import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, json, unauthorized, serverError } from "@/src/lib/http";
import { projectAccessWhere } from "@/src/lib/permissions";
import { resolveSessionUserId } from "@/src/lib/session-user";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10000;
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

type NotesQuery = {
  q?: string;
  archived?: "true" | "false";
  pinned?: "true" | "false";
  projectId?: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseBoolean(value: string | null): boolean | null {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
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
    const q = searchParams.get("q")?.trim() || "";
    const archived = parseBoolean(searchParams.get("archived"));
    const pinned = parseBoolean(searchParams.get("pinned"));
    const projectId = searchParams.get("projectId")?.trim() || "";

    if (projectId && !isUuid(projectId)) {
      return badRequest("projectId invalido");
    }

    const filters: NotesQuery = {
      q: q || undefined,
      archived: archived === null ? undefined : String(archived) as "true" | "false",
      pinned: pinned === null ? undefined : String(pinned) as "true" | "false",
      projectId: projectId || undefined,
    };

    const notes = await prisma.quickNote.findMany({
      where: {
        ownerId: actorUserId,
        ...(filters.archived ? { isArchived: filters.archived === "true" } : {}),
        ...(filters.pinned ? { isPinned: filters.pinned === "true" } : {}),
        ...(filters.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" } },
                { content: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return json(notes);
  } catch (error) {
    console.error("GET_NOTES_ERROR", error);
    return serverError("Error al obtener notas");
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
      content?: unknown;
      color?: unknown;
      projectId?: unknown;
      sourceDocumentId?: unknown;
      isPinned?: unknown;
      isArchived?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const color = typeof body.color === "string" ? body.color.trim() : "#fef3c7";
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    const sourceDocumentId = typeof body.sourceDocumentId === "string" ? body.sourceDocumentId.trim() : "";

    if (title.length > MAX_TITLE_LENGTH) {
      return badRequest("El titulo no puede superar 120 caracteres");
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return badRequest("El contenido no puede superar 10000 caracteres");
    }

    if (!COLOR_REGEX.test(color)) {
      return badRequest("Color invalido");
    }

    if (body.projectId !== undefined && body.projectId !== null && typeof body.projectId !== "string") {
      return badRequest("projectId invalido");
    }

    if (body.sourceDocumentId !== undefined && body.sourceDocumentId !== null && typeof body.sourceDocumentId !== "string") {
      return badRequest("sourceDocumentId invalido");
    }

    if (projectId && !isUuid(projectId)) {
      return badRequest("projectId invalido");
    }

    if (sourceDocumentId && !isUuid(sourceDocumentId)) {
      return badRequest("sourceDocumentId invalido");
    }

    if (projectId && sourceDocumentId) {
      return badRequest("Usa projectId o sourceDocumentId, no ambos");
    }

    let resolvedProjectId = projectId;

    if (sourceDocumentId) {
      const sourceDocument = await prisma.document.findFirst({
        where: {
          id: sourceDocumentId,
          OR: [
            { creatorId: actorUserId },
            { users: { some: { userId: actorUserId } } },
            { project: projectAccessWhere(actorUserId) },
          ],
        },
        select: {
          id: true,
          projectId: true,
        },
      });

      if (!sourceDocument) {
        return badRequest("Documento no disponible");
      }

      if (!sourceDocument.projectId) {
        return badRequest("El documento no pertenece a un proyecto");
      }

      resolvedProjectId = sourceDocument.projectId;
    }

    if (resolvedProjectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: resolvedProjectId,
          ...projectAccessWhere(actorUserId),
        },
        select: { id: true },
      });

      if (!project) {
        return badRequest("Proyecto no disponible");
      }
    }

    if (body.isPinned !== undefined && typeof body.isPinned !== "boolean") {
      return badRequest("isPinned invalido");
    }

    if (body.isArchived !== undefined && typeof body.isArchived !== "boolean") {
      return badRequest("isArchived invalido");
    }

    const note = await prisma.quickNote.create({
      data: {
        title,
        content,
        color,
        projectId: resolvedProjectId || null,
        ownerId: actorUserId,
        isPinned: typeof body.isPinned === "boolean" ? body.isPinned : false,
        isArchived: typeof body.isArchived === "boolean" ? body.isArchived : false,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return json(note, 201);
  } catch (error) {
    console.error("CREATE_NOTE_ERROR", error);
    return serverError("Error al crear nota");
  }
}
