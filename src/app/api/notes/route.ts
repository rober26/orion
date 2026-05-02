import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, json, unauthorized, serverError } from "@/src/lib/http";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10000;
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

type NotesQuery = {
  q?: string;
  archived?: "true" | "false";
  pinned?: "true" | "false";
};

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

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const archived = parseBoolean(searchParams.get("archived"));
    const pinned = parseBoolean(searchParams.get("pinned"));

    const filters: NotesQuery = {
      q: q || undefined,
      archived: archived === null ? undefined : String(archived) as "true" | "false",
      pinned: pinned === null ? undefined : String(pinned) as "true" | "false",
    };

    const notes = await prisma.quickNote.findMany({
      where: {
        ownerId: sessionUser.userId,
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
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
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

    const body = (await req.json()) as {
      title?: unknown;
      content?: unknown;
      color?: unknown;
      isPinned?: unknown;
      isArchived?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const color = typeof body.color === "string" ? body.color.trim() : "#fef3c7";

    if (title.length > MAX_TITLE_LENGTH) {
      return badRequest("El titulo no puede superar 120 caracteres");
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return badRequest("El contenido no puede superar 10000 caracteres");
    }

    if (!COLOR_REGEX.test(color)) {
      return badRequest("Color invalido");
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
        ownerId: sessionUser.userId,
        isPinned: typeof body.isPinned === "boolean" ? body.isPinned : false,
        isArchived: typeof body.isArchived === "boolean" ? body.isArchived : false,
      },
    });

    return json(note, 201);
  } catch (error) {
    console.error("CREATE_NOTE_ERROR", error);
    return serverError("Error al crear nota");
  }
}
