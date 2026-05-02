import { getSessionUser } from "../../../../../../lib/auth";
import { forbidden, json, serverError, unauthorized } from "../../../../../../lib/http";
import prisma from "../../../../../../lib/prisma";
import { hasAcceptedConnection } from "../../../../../../lib/permissions";

type RouteParams = { params: Promise<{ userId: string }> };

function formatProfile<T extends { id: string; firstName: string | null; lastName: string | null; username: string }>(
  user: T,
) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username;
  const tag = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();

  return {
    ...user,
    name,
    tag,
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const { userId } = await params;

    if (!userId) {
      return json({ error: "Usuario invalido" }, 400);
    }

    if (sessionUser.userId !== userId) {
      const connected = await hasAcceptedConnection(sessionUser.userId, userId);
      if (!connected) {
        return forbidden("Solo puedes ver perfiles de conexiones aceptadas");
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        profileVisibility: true,
      },
    });

    if (!user) {
      return json({ error: "Usuario no encontrado" }, 404);
    }

    const [projects, notebooks, folders, documents, calendars] = await Promise.all([
      prisma.project.findMany({
        where: {
          isPublic: true,
          OR: [{ ownerId: user.id }, { creatorId: user.id }],
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          isPublic: true,
          ownerId: true,
          creatorId: true,
        },
      }),
      prisma.notebook.findMany({
        where: {
          isPublic: true,
          OR: [{ ownerId: user.id }, { creatorId: user.id }],
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          isPublic: true,
          ownerId: true,
          creatorId: true,
          folderId: true,
        },
      }),
      prisma.notebookFolder.findMany({
        where: {
          isPublic: true,
          notebooks: {
            some: {
              OR: [{ ownerId: user.id }, { creatorId: user.id }],
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          isPublic: true,
          parentId: true,
        },
      }),
      prisma.document.findMany({
        where: {
          isPublic: true,
          OR: [
            { creatorId: user.id },
            {
              notebook: {
                OR: [{ ownerId: user.id }, { creatorId: user.id }],
              },
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          title: true,
          isPublic: true,
          creatorId: true,
          notebookId: true,
          updatedAt: true,
        },
      }),
      prisma.calendar.findMany({
        where: {
          visibility: "PUBLIC",
          OR: [{ ownerId: user.id }, { creatorId: user.id }],
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          color: true,
          visibility: true,
          ownerId: true,
          creatorId: true,
          updatedAt: true,
        },
      }),
    ]);

    return json({
      profile: formatProfile(user),
      projects,
      notebooks,
      folders,
      documents,
      calendars,
    });
  } catch (error) {
    console.error("GET_CONNECTION_PROFILE_ERROR", error);
    return serverError();
  }
}
