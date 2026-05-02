import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getSessionUser } from "@/src/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [projects, notebooks, folders, documents, calendars] = await Promise.all([
      prisma.project.findMany({
        where: {
          isPublic: true,
          OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
        },
        orderBy: { updatedAt: "desc" },
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
          OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          folderId: true,
          isPublic: true,
          ownerId: true,
          creatorId: true,
        },
      }),
      prisma.notebookFolder.findMany({
        where: {
          isPublic: true,
          notebooks: {
            some: {
              OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
            },
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          isPublic: true,
        },
      }),
      prisma.document.findMany({
        where: {
          isPublic: true,
          OR: [
            { creatorId: sessionUser.userId },
            {
              notebook: {
                OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
              },
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
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
          OR: [{ ownerId: sessionUser.userId }, { creatorId: sessionUser.userId }],
        },
        orderBy: { updatedAt: "desc" },
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

    return NextResponse.json({ projects, folders, notebooks, documents, calendars });
  } catch (error) {
    console.error("GET_PUBLIC_PROFILE_CONTENT_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
