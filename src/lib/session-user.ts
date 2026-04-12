import prisma from "@/src/lib/prisma";
import type { SessionUser } from "@/src/lib/auth";

export async function resolveSessionUserId(sessionUser: SessionUser): Promise<string | null> {
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
