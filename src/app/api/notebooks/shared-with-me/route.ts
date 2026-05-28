import { AccessRole } from "@prisma/client";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";
import { json, serverError, unauthorized } from "@/src/lib/http";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const [sharedNotebooks, sharedDocuments, sharedFolders] = await Promise.all([
      prisma.notebookUser.findMany({
        where: {
          userId: sessionUser.userId,
          notebook: {
            NOT: {
              OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
            },
          },
        },
        orderBy: { joinedAt: "desc" },
        include: {
          notebook: {
            select: {
              id: true,
              title: true,
              color: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.documentUser.findMany({
        where: {
          userId: sessionUser.userId,
          document: {
            projectId: null,
            creatorId: { not: sessionUser.userId },
          },
        },
        orderBy: { joinedAt: "desc" },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              notebookId: true,
              creator: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.notebookFolderUser.findMany({
        where: {
          userId: sessionUser.userId,
          invitedBy: { not: null },
          role: { not: AccessRole.OWNER },
        },
        orderBy: { joinedAt: "desc" },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return json({
      folders: sharedFolders.map((item) => ({
        id: item.folder.id,
        name: item.folder.name,
        permission: item.role,
        sharedAt: item.joinedAt,
      })),
      notebooks: sharedNotebooks.map((item) => ({
        id: item.notebook.id,
        title: item.notebook.title,
        color: item.notebook.color,
        permission: item.role,
        sharedAt: item.joinedAt,
        owner: item.notebook.owner,
      })),
      documents: sharedDocuments.map((item) => ({
        id: item.document.id,
        title: item.document.title,
        notebookId: item.document.notebookId,
        permission: item.role,
        sharedAt: item.joinedAt,
        owner: item.document.creator,
      })),
    });
  } catch (error) {
    console.error("GET_SHARED_WITH_ME_ERROR", error);
    return serverError();
  }
}
