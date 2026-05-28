import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/src/lib/http";
import {
  canViewProject,
  documentAccessWhere,
  notebookAccessWhere,
  notebookEditorWhere,
  projectReadWhere,
} from "@/src/lib/permissions";
import { resolveSessionUserId } from "@/src/lib/session-user";
import { getInvalidSessionMessage } from "@/src/lib/validation/auth";

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
    const standaloneOnly = searchParams.get("standalone") === "true";
    const projectOnly = searchParams.get("projectOnly") === "true";
    const notebookId = searchParams.get("notebookId");
    const projectId = searchParams.get("projectId");

    if (notebookId) {
      const canAccessNotebook = await prisma.notebook.findFirst({
        where: {
          id: notebookId,
          ...notebookAccessWhere(actorUserId),
        },
        select: { id: true },
      });

      if (!canAccessNotebook) {
        return forbidden();
      }
    }

    if (projectId) {
      if (!(await canViewProject(projectId, actorUserId))) {
        return forbidden();
      }
    }

    const baseAccess = documentAccessWhere(actorUserId);

    const where = projectId
      ? {
          projectId,
          OR: [{ creatorId: actorUserId }, { project: projectReadWhere(actorUserId) }],
        }
      : projectOnly
        ? {
            projectId: { not: null },
            OR: [{ creatorId: actorUserId }, { project: projectReadWhere(actorUserId) }],
          }
      : {
          projectId: null,
          ...(standaloneOnly ? { notebookId: null } : {}),
          ...(notebookId ? { notebookId } : {}),
          ...baseAccess,
        };

    const documents = await prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        notebookId: true,
        projectId: true,
        position: true,
        creatorId: true,
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        users: {
          where: { userId: actorUserId },
          select: { role: true },
          take: 1,
        },
      }
    });

    const payload = documents.map((document) => {
      const membership = document.users[0] ?? null;
      const isOwnerLike = document.creatorId === actorUserId;

      return {
        id: document.id,
        title: document.title,
        updatedAt: document.updatedAt,
        notebookId: document.notebookId,
        projectId: document.projectId,
        project: document.project,
        position: document.position,
        creator: document.creator,
        currentUserRole: isOwnerLike ? "OWNER" : membership?.role ?? null,
        isSharedWithMe: !isOwnerLike && Boolean(membership),
      };
    });

    return json(payload);
  } catch (error) {
    console.error("GET_DOCUMENTS_ERROR", error);
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
      return unauthorized(getInvalidSessionMessage());
    }

    const body = await req.json();
    const { title, notebookId } = body;

    if (!title) {
      return badRequest("Titulo obligatorio");
    }

    if (notebookId) {
      const canUseNotebook = await prisma.notebook.findFirst({
        where: {
          id: notebookId,
          ...notebookEditorWhere(actorUserId),
        },
        select: { id: true },
      });

      if (!canUseNotebook) {
        return forbidden("Acceso denegado al cuaderno");
      }
    }

    const newDocument = await prisma.document.create({
      data: {
        title,
        creatorId: actorUserId,
        notebookId: notebookId || null, 
        projectId: null,
        content: {}, 
      },
    });

    return json(newDocument, 201);
  } catch (error: unknown) {
    console.error("Error al crear el documento:", error);

    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (errorCode === "P2023") {
      return badRequest("Formato de ID (UUID) invalido");
    }

    return serverError();
  }
}
