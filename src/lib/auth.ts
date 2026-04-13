import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "./prisma";
import { getJwtSecret } from "./session";

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

function isValidRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "USER";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("orion_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded === "string") {
      return null;
    }

    const payload = decoded as JwtPayload;
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;

    if (typeof userId !== "string" || typeof email !== "string" || !isValidRole(role)) {
      return null;
    }

    return { userId, email, role };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}
