import { getSessionUser } from "@/src/lib/auth";
import { json, serverError, unauthorized } from "@/src/lib/http";
import { documentAccessWhere, projectReadWhere } from "@/src/lib/permissions";
import prisma from "@/src/lib/prisma";
import { resolveSessionUserId } from "@/src/lib/session-user";

type SearchType = "project" | "task" | "document";

type SearchResult = {
  id: string;
  title: string;
  type: SearchType;
  href: string;
  subtitle: string | null;
  updatedAt: string;
};

const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS_PER_TYPE = 6;
const MAX_RESULTS_TOTAL = 12;

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return unauthorized();
    }

    const actorUserId = await resolveSessionUserId(sessionUser);
    if (!actorUserId) {
      return unauthorized("Sesion invalida. Inicia sesion de nuevo");
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") ?? "";
    const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);

    if (!query) {
      return json({ results: [] as SearchResult[] });
    }

    const [projects, tasks, documents] = await Promise.all([
      prisma.project.findMany({
        where: {
          AND: [
            projectReadWhere(actorUserId),
            {
              OR: [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }],
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_RESULTS_PER_TYPE,
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      }),
      prisma.task.findMany({
        where: {
          AND: [
            {
              project: projectReadWhere(actorUserId),
            },
            {
              OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }],
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_RESULTS_PER_TYPE,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          projectId: true,
          project: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.document.findMany({
        where: {
          AND: [
            documentAccessWhere(actorUserId),
            {
              title: { contains: query, mode: "insensitive" },
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_RESULTS_PER_TYPE,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          project: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const results: SearchResult[] = [
      ...projects.map((project) => ({
        id: project.id,
        title: project.name,
        type: "project" as const,
        href: `/projects/${project.id}`,
        subtitle: null,
        updatedAt: project.updatedAt.toISOString(),
      })),
      ...tasks.map((task) => ({
        id: task.id,
        title: task.title,
        type: "task" as const,
        href: `/projects/${task.projectId}/tasks`,
        subtitle: task.project.name,
        updatedAt: task.updatedAt.toISOString(),
      })),
      ...documents.map((document) => ({
        id: document.id,
        title: document.title,
        type: "document" as const,
        href: `/notebooks?doc=${document.id}`,
        subtitle: document.project?.name ?? null,
        updatedAt: document.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_RESULTS_TOTAL);

    return json({ results });
  } catch (error) {
    console.error("GLOBAL_SEARCH_ERROR", error);
    return serverError();
  }
}
