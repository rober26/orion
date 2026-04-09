import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [sharedNotebooks, sharedDocuments] = await Promise.all([
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
    ]);

    return NextResponse.json({
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
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
