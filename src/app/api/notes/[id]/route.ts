import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import { projectAccessWhere } from "@/src/lib/permissions";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10000;
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    const note = await prisma.quickNote.findFirst({
      where: {
        id,
        ownerId: sessionUser.userId,
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

    if (!note) {
      return forbidden("Nota no encontrada");
    }

    return json(note);
  } catch {
    return serverError("Error al obtener la nota");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    const existing = await prisma.quickNote.findFirst({
      where: {
        id,
        ownerId: sessionUser.userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return forbidden("Acceso denegado");
    }

    const body = (await req.json()) as {
      title?: unknown;
      content?: unknown;
      color?: unknown;
      projectId?: unknown;
      isPinned?: unknown;
      isArchived?: unknown;
    };

    if (body.title !== undefined && typeof body.title !== "string") {
      return badRequest("Titulo invalido");
    }

    if (body.content !== undefined && typeof body.content !== "string") {
      return badRequest("Contenido invalido");
    }

    if (body.color !== undefined && (typeof body.color !== "string" || !COLOR_REGEX.test(body.color))) {
      return badRequest("Color invalido");
    }

    if (body.projectId !== undefined && body.projectId !== null && typeof body.projectId !== "string") {
      return badRequest("projectId invalido");
    }

    if (body.isPinned !== undefined && typeof body.isPinned !== "boolean") {
      return badRequest("isPinned invalido");
    }

    if (body.isArchived !== undefined && typeof body.isArchived !== "boolean") {
      return badRequest("isArchived invalido");
    }

    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const content = typeof body.content === "string" ? body.content : undefined;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : undefined;

    if (title !== undefined && title.length > MAX_TITLE_LENGTH) {
      return badRequest("El titulo no puede superar 120 caracteres");
    }

    if (content !== undefined && content.length > MAX_CONTENT_LENGTH) {
      return badRequest("El contenido no puede superar 10000 caracteres");
    }

    if (projectId !== undefined && projectId.length > 0 && !isUuid(projectId)) {
      return badRequest("projectId invalido");
    }

    if (projectId !== undefined && projectId.length > 0) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ...projectAccessWhere(sessionUser.userId),
        },
        select: { id: true },
      });

      if (!project) {
        return badRequest("Proyecto no disponible");
      }
    }

    const note = await prisma.quickNote.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(projectId !== undefined ? { projectId: projectId || null } : {}),
        ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
        ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
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

    return json(note);
  } catch {
    return serverError("Error al actualizar la nota");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { id } = await params;

    const existing = await prisma.quickNote.findFirst({
      where: {
        id,
        ownerId: sessionUser.userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return forbidden("Acceso denegado");
    }

    await prisma.quickNote.delete({ where: { id } });

    return json({ ok: true });
  } catch {
    return serverError("Error al eliminar la nota");
  }
}
