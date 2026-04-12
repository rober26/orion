import prisma from "@/src/lib/prisma";
import { getSessionUser, type SessionUser } from "@/src/lib/auth";
import { badRequest, json, serverError, unauthorized } from "@/src/lib/http";
import { projectAccessWhere } from "@/src/lib/permissions";

const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_STATUSES = ["active", "archived", "all"] as const;

type ProjectStatus = (typeof PROJECT_STATUSES)[number];

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

// Obtener todos los proyectos del usuario
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
          select: { documents: true, tasks: true },
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
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const body = await req.json();
    const rawName = typeof body?.name === "string" ? body.name : "";
    const rawDescription = typeof body?.description === "string" ? body.description : "";
    const rawColor = typeof body?.color === "string" ? body.color.trim() : "";
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

    const newProject = await prisma.project.create({
      data: {
        name,
        description: description || "Nuevo proyecto",
        color: rawColor || "#3b82f6",
        creatorId: actorUserId,
        ownerId: actorUserId,
      },
    });

    return json(newProject, 201);
  } catch (error: unknown) {
    console.error("ERROR CREAR PROYECTO:", error);
    return serverError("Error al crear proyecto");
  }
}
